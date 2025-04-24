# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import _, models,api,fields
from dateutil.relativedelta import relativedelta
from collections import defaultdict
import logging
_logger = logging.getLogger(__name__)

class PosOrder(models.Model):
    _inherit = 'pos.order'
    
    def confirm_coupon_programs(self, coupon_data):
        """
        This is called after the order is created.

        This will create all necessary coupons and link them to their line orders etc..

        It will also return the points of all concerned coupons to be updated in the cache.
        """
        get_partner_id = lambda partner_id: partner_id and self.env['res.partner'].browse(partner_id).exists() and partner_id or False
        # Keys are stringified when using rpc
        coupon_data = {int(k): v for k, v in coupon_data.items()}
        print("---coupon_data--",coupon_data)
        self._check_existing_loyalty_cards(coupon_data)
        # Map negative id to newly created ids.
        coupon_new_id_map = {k: k for k in coupon_data.keys() if k > 0}
        print("---coupon_new_id_map--",coupon_new_id_map)
        # Create the coupons that were awarded by the order.
        coupons_to_create = {k: v for k, v in coupon_data.items() if k < 0 and not v.get('giftCardId')}
        coupon_create_vals = [{
            'program_id': p['program_id'],
            'partner_id': get_partner_id(p.get('partner_id', False)),
            'code': p.get('barcode') or self.env['loyalty.card']._generate_code(),
            'points': p.get('points') if self.env['loyalty.program'].browse(p['program_id']).program_type == 'loyalty' else 0,
            'source_pos_order_id': self.id,
        } for p in coupons_to_create.values()]
        print("---coupon_create_vals--",coupon_create_vals)
        # Pos users don't have the create permission
        new_coupons = self.env['loyalty.card'].with_context(action_no_send_mail=True).sudo().create(coupon_create_vals)

        # We update the gift card that we sold when the gift_card_settings = 'scan_use'.
        gift_cards_to_update = [v for v in coupon_data.values() if v.get('giftCardId')]
        updated_gift_cards = self.env['loyalty.card']
        for coupon_vals in gift_cards_to_update:
            gift_card = self.env['loyalty.card'].browse(coupon_vals.get('giftCardId'))
            gift_card.write({
                'points': coupon_vals['points'],
                'source_pos_order_id': self.id,
                'partner_id': get_partner_id(coupon_vals.get('partner_id', False)),
            })
            updated_gift_cards |= gift_card

        # Map the newly created coupons
        for old_id, new_id in zip(coupons_to_create.keys(), new_coupons):
            coupon_new_id_map[new_id.id] = old_id
        all_coupons = self.env['loyalty.card'].browse(coupon_new_id_map.keys()).exists()
        lines_per_reward_code = defaultdict(lambda: self.env['pos.order.line'])
        for line in self.lines:
            if not line.reward_identifier_code:
                continue
            lines_per_reward_code[line.reward_identifier_code] |= line
        for coupon in all_coupons:
            if coupon.id in coupon_new_id_map:
                # Coupon existed previously, update amount of points.
                coupon.points += coupon_data[coupon_new_id_map[coupon.id]]['points']
            for reward_code in coupon_data[coupon_new_id_map[coupon.id]].get('line_codes', []):
                lines_per_reward_code[reward_code].coupon_id = coupon
        print("=-=new_coupons-=-",new_coupons)
        if self.partner_id:
            loyalty_obj = self.env['loyalty.card'].sudo().search([('id','not in',new_coupons.ids),('partner_id','=',self.partner_id.id),('program_type','=','loyalty')],limit=1)
            if loyalty_obj:
                if coupon_data.get(loyalty_obj.id).get('points') > 0:
                    self.env["loyalty.card.unpoint"].create({
                        'loyalty_card_id':loyalty_obj.id,
                        'loyalty_point':coupon_data.get(loyalty_obj.id).get('points'),
                        'start_date':fields.Datetime.now() + relativedelta(days=8),
                        'expire_date':fields.Datetime.now() + relativedelta(years=1)
                    })
                    loyalty_obj.points += coupon_data.get(loyalty_obj.id).get('points')
#                else:
#                    loyalty_obj.points += coupon_data.get(loyalty_obj.id).get('points')
#                new_coupons -= add_partner_coupon
#                all_coupons -= add_partner_coupon
#                all_coupons += loyalty_obj
#                for id_ in add_partner_coupon.ids:
#                    coupon_new_id_map.pop(id_)
#                add_partner_coupon.unlink()
            else:
                add_partner_coupon = new_coupons.filtered(lambda x:x.program_type == 'loyalty')
                for c in add_partner_coupon:
                    if c.points > 0:
                        self.env["loyalty.card.unpoint"].create({
                            'loyalty_card_id':c.id,
                            'loyalty_point':c.points,
                            'start_date':fields.Datetime.now() + relativedelta(days=8),
                            'expire_date':fields.Datetime.now() + relativedelta(years=1)
                        })
                    c.partner_id = self.partner_id.id
        
        # Send creation email
        new_coupons.with_context(action_no_send_mail=False)._send_creation_communication()
        # Reports per program
        report_per_program = {}
        coupon_per_report = defaultdict(list)
        # Important to include the updated gift cards so that it can be printed. Check coupon_report.
        for coupon in new_coupons | updated_gift_cards:
            if coupon.program_id not in report_per_program:
                report_per_program[coupon.program_id] = coupon.program_id.communication_plan_ids.\
                    filtered(lambda c: c.trigger == 'create').pos_report_print_id
            for report in report_per_program[coupon.program_id]:
                coupon_per_report[report.id].append(coupon.id)
        return {
            'coupon_updates': [{
                'old_id': coupon_new_id_map[coupon.id],
                'id': coupon.id,
                'points': coupon.points,
                'code': coupon.code,
                'program_id': coupon.program_id.id,
                'partner_id': coupon.partner_id.id,
            } for coupon in all_coupons if coupon.program_id.is_nominative],
            'program_updates': [{
                'program_id': program.id,
                'usages': program.total_order_count,
            } for program in all_coupons.program_id],
            'new_coupon_info': [{
                'program_name': coupon.program_id.name,
                'expiration_date': coupon.expiration_date,
                'code': coupon.code,
            } for coupon in new_coupons if (
                coupon.program_id.applies_on == 'future'
                # Don't send the coupon code for the gift card and ewallet programs.
                # It should not be printed in the ticket.
                and coupon.program_id.program_type not in ['gift_card', 'ewallet']
            )],
            'coupon_report': coupon_per_report,
        }
