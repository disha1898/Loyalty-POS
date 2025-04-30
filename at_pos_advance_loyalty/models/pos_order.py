# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import _, models,api,fields
from dateutil.relativedelta import relativedelta
from collections import defaultdict
from odoo.tools import float_compare
import logging
_logger = logging.getLogger(__name__)

class PosOrderLine(models.Model):
    _inherit = 'pos.order.line'
    
    refunded_loyalty_points = fields.Float()
    
    def _export_for_ui(self, orderline):
        result = super(PosOrderLine,self)._export_for_ui(orderline=orderline)
        result['refunded_loyalty_points'] = orderline.refunded_loyalty_points
        return result
    
    def get_loyalty_earn_points_refunded(self,refundedqty):
        reward_lines = self.order_id.lines.filtered(lambda x:x.is_reward_line)
        earned_points = self.env["loyalty.card.unpoint"].sudo().search([('order_tracking_number','=',self.order_id.pos_reference)])
        total_order_price = self.order_id.amount_total
        line_refunded_amount = abs((self.price_subtotal_incl / self.qty) * refundedqty)
        return ((line_refunded_amount * earned_points.loyalty_point)/total_order_price) if earned_points and earned_points.loyalty_point else 0
    
    def get_loyalty_points_refunded(self,refundedqty):
        print("=-=-=",self,self.order_id,self.order_id.tracking_number)
        earned_points = self.env["loyalty.card.unpoint"].sudo().search([('order_tracking_number','=',self.order_id.pos_reference)])
        for earned_point in earned_points:
            print("=-=-=earned_points",earned_point.name,earned_point.start_date,earned_point.loyalty_point)
        total_order_price = sum(self.order_id.lines.filtered(lambda x:not x.is_reward_line).mapped('price_subtotal_incl'))
        line_refunded_amount = abs((self.price_subtotal_incl / self.qty) * refundedqty)
        return ((line_refunded_amount * earned_points.loyalty_point)/(total_order_price or line_refunded_amount)) if earned_points and earned_points.loyalty_point else 0

class PosOrder(models.Model):
    _inherit = 'pos.order'
    
    refunded_loyalty_earn_points = fields.Float()
    
    def _export_for_ui(self, order):
        result = super(PosOrder,self)._export_for_ui(order=order)
        result['refunded_loyalty_earn_points'] = order.refunded_loyalty_earn_points
        return result
    
    def loyalty_points_validation(self,addedPoints,usedPoints,refundLoyaltyLoss,refundLoyaltyEarn,tracking_number,NewpointChanges,partner):
        partner_id = self.env['res.partner'].search([('id','=',partner)])
        print("=-=-partner_id",partner_id,NewpointChanges)
        if NewpointChanges:
            for newpoints in NewpointChanges:
                val = {
                        'program_id': newpoints.get('program_id'),
                        'partner_id': partner_id.id
                    }
                coupon = self.env['loyalty.card'].sudo().create(val)
                addedPoints[coupon.id] = newpoints.get('points')
        if addedPoints:
            for coupon in addedPoints:
                coupon_obj = self.env['loyalty.card'].browse(int(coupon)).exists().filtered('program_id.active')
                if coupon_obj and addedPoints.get(coupon):
                    self.env["loyalty.card.unpoint"].create({
                                'name':"Loyalty earned in %s"%tracking_number,
                                'loyalty_card_id':coupon_obj.id,
                                'loyalty_point':addedPoints.get(coupon),
                                'remaining_point':addedPoints.get(coupon),
                                'start_date':fields.Datetime.now() + relativedelta(days=8),
#                                'start_date':fields.Datetime.now(),
                                'expire_date':fields.Datetime.now() + relativedelta(years=1),
                                'pos_order_id':self.id,
                                'order_tracking_number':tracking_number
                            })
        if refundLoyaltyEarn:
            coupon_obj = self.env['loyalty.card'].search([('program_type','=','loyalty'),('partner_id','=',partner_id.id)],limit=1)
            self.env["loyalty.card.unpoint"].create({
                        'name':"Loyalty earned when order refunded in %s"%tracking_number,
                        'loyalty_card_id':coupon_obj.id,
                        'loyalty_point':refundLoyaltyEarn,
                        'remaining_point':refundLoyaltyEarn,
                        'start_date':fields.Datetime.now() + relativedelta(days=8),
#                        'start_date':fields.Datetime.now(),
                        'expire_date':fields.Datetime.now() + relativedelta(years=1),
                        'pos_order_id':self.id,
                        'order_tracking_number':tracking_number
                    })
            coupon_obj.points += refundLoyaltyEarn
        if usedPoints:
            for coupon in usedPoints:
                coupon_obj = self.env['loyalty.card'].browse(int(coupon)).exists().filtered('program_id.active')
                if coupon_obj:
                    domain = [('remaining_point','>',0),('expire_date','>=',fields.Datetime.now()),('loyalty_card_id','=',coupon_obj.id)]
                    earned_points = self.env["loyalty.card.unpoint"].search(domain,order='start_date')
                    used_points = -1 * usedPoints.get(coupon)
                    while used_points:
                        for earned_point in earned_points:
                            remaining_point = earned_point.remaining_point
                            if used_points < remaining_point:
                                remaining_point = remaining_point - used_points
                                used_points = 0
                            else:
                                used_points = used_points - remaining_point
                                remaining_point = 0
                            earned_point.remaining_point = remaining_point
                    self.env["loyalty.card.history"].create({
                            'name':"Loyalty used in %s"%tracking_number,
                            'loyalty_card_id':coupon_obj.id,
                            'used_points':-1 * usedPoints.get(coupon),
                            'pos_order_id':self.id,
                            'order_tracking_number':tracking_number
                        })
        if refundLoyaltyLoss:
            coupon_obj = self.env['loyalty.card'].search([('program_type','=','loyalty'),('partner_id','=',partner_id.id)],limit=1)
            if coupon_obj:
                domain = [('remaining_point','>',0),('expire_date','>=',fields.Datetime.now()),('loyalty_card_id','=',coupon_obj.id)]
                earned_points = self.env["loyalty.card.unpoint"].search(domain,order='start_date')
                used_points = refundLoyaltyLoss
                while used_points:
                    for earned_point in earned_points:
                        remaining_point = earned_point.remaining_point
                        if used_points < remaining_point:
                            remaining_point = remaining_point - used_points
                            used_points = 0
                        else:
                            used_points = used_points - remaining_point
                            remaining_point = 0
                        earned_point.remaining_point = remaining_point
                self.env["loyalty.card.history"].create({
                        'name':"Loyalty used when order refunded in %s"%tracking_number,
                        'loyalty_card_id':coupon_obj.id,
                        'used_points':refundLoyaltyLoss,
                        'pos_order_id':self.id,
                        'order_tracking_number':tracking_number
                    })
                coupon_obj.points -= refundLoyaltyLoss
        
        return True
        
    
    def validate_coupon_programs(self, point_changes, new_codes):
        """
        This is called upon validating the order in the pos.

        This will check the balance for any pre-existing coupon to make sure that the rewards are in fact all claimable.
        This will also check that any set code for coupons do not exist in the database.
        """
        point_changes = {int(k): v for k, v in point_changes.items()}
        coupon_ids_from_pos = set(point_changes.keys())
        coupons = self.env['loyalty.card'].browse(coupon_ids_from_pos).exists().filtered('program_id.active')
        coupon_difference = set(coupons.ids) ^ coupon_ids_from_pos
        if coupon_difference:
            return {
                'successful': False,
                'payload': {
                    'message': _('Some coupons are invalid. The applied coupons have been updated. Please check the order.'),
                    'removed_coupons': list(coupon_difference),
                }
            }
        for coupon in coupons:
            print("=-=point_changes-=",coupon.get_custom_points(),point_changes[coupon.id])
            if float_compare(coupon.get_custom_points(), -point_changes[coupon.id], 2) == -1:
                return {
                    'successful': False,
                    'payload': {
                        'message': _('There are not enough points for the coupon: %s.', coupon.code),
                        'updated_points': {c.id: c.points for c in coupons}
                    }
                }
        # Check existing coupons
        coupons = self.env['loyalty.card'].search([('code', 'in', new_codes)])
        if coupons:
            return {
                'successful': False,
                'payload': {
                    'message': _('The following codes already exist in the database, perhaps they were already sold?\n%s',
                        ', '.join(coupons.mapped('code'))),
                }
            }
        return {
            'successful': True,
            'payload': {},
        }
