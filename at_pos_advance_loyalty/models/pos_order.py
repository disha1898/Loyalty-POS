# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import _, models,api,fields
from dateutil.relativedelta import relativedelta
from collections import defaultdict
from odoo.tools import float_compare
import logging
_logger = logging.getLogger(__name__)

class PosOrder(models.Model):
    _inherit = 'pos.order'
    
    def loyalty_points_validation(self,addedPoints,usedPoints):
        if addedPoints:
            for coupon in addedPoints:
                coupon_obj = self.env['loyalty.card'].browse(int(coupon)).exists().filtered('program_id.active')
                if coupon_obj:
                    self.env["loyalty.card.unpoint"].create({
                                'loyalty_card_id':coupon_obj.id,
                                'loyalty_point':addedPoints.get(coupon),
                                'remaining_point':addedPoints.get(coupon),
#                                'start_date':fields.Datetime.now() + relativedelta(days=8),
                                'start_date':fields.Datetime.now(),
                                'expire_date':fields.Datetime.now() + relativedelta(years=1)
                            })
        if usedPoints:
            for coupon in usedPoints:
                coupon_obj = self.env['loyalty.card'].browse(int(coupon)).exists().filtered('program_id.active')
                if coupon_obj:
                    domain = [('remaining_point','>',0),('start_date','<=',fields.Datetime.now()),('expire_date','>=',fields.Datetime.now()),('loyalty_card_id','=',coupon_obj.id)]
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
                            'loyalty_card_id':coupon_obj.id,
                            'used_points':-1 * usedPoints.get(coupon),
                        })
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
