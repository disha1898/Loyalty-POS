from odoo import api, models, fields
import random
from datetime import datetime, timedelta

class LoyaltyCard(models.Model):
    _inherit = 'loyalty.card'

    loyalty_card_unpoint_ids = fields.One2many("loyalty.card.unpoint", "loyalty_card_id")
    loyalty_card_history_ids = fields.One2many("loyalty.card.history", "loyalty_card_id")
    compute_points = fields.Float(tracking=True,compute='_compute_points_display')
    points_display = fields.Char(compute='_compute_points_display')
    otp_number = fields.Char("OTP", size=6)
    otp_generated_time = fields.Datetime("OTP Generated Time")
    otp_history_ids = fields.One2many("otp.link" ,"otp_link_id")

    @api.model
    def get_otp_expiry_time(self):
        value = self.env['ir.config_parameter'].sudo().get_param('loyalty_program.otp_expire',10)
        try:
            return int(value)
        except (TypeError, ValueError):
            return 10

    def open_otp_wizard(self):
        return {
            'name': 'Confirm OTP',
            'type': 'ir.actions.act_window',
            'res_model': 'loyalty.otp.wizard',
            'view_mode': 'form',
            'target': 'new',
        }
    
    def generate_otp(self):
        for record in self:
            otp_code = ''.join(random.choices("0123456789", k=6)) 
            record.otp_number = otp_code
            record.otp_generated_time = fields.Datetime.now()
            
            otp_link = self.env['otp.link'].create({
                'name': f'You OTP is:{record.id}',
                'otp': otp_code,
                'otp_link_id': record.id,
                'partner_id': record.partner_id.id
            })
            otp_link.send_message_sms()
            
    def validate_otp(self, otp):
        otp_expire_minutes = self.get_otp_expiry_time()
        current_time = fields.Datetime.now()
        # print("=-=-=otp_expire_minutes",otp_expire_minutes)
        expiry_time = self.otp_generated_time + timedelta(minutes=otp_expire_minutes)
        error = False
        if current_time > expiry_time:
            error = "OTP has been expired! Please generate a new OTP."
        if otp != self.otp_number:
            error = "Invalid OTP entered."
        return {"error":error}

    @api.depends('point_name')
    def _compute_points_display(self):
        for card in self:
            card.points_display = card._format_points(card.get_custom_points()) if card.program_id.program_type == 'loyalty' else card.points
            card.compute_points = card.get_custom_points() if card.program_id.program_type == 'loyalty' else card.points
    
    def get_custom_points(self):
        domain = [('start_date','<=',fields.Datetime.now()),('expire_date','>=',fields.Datetime.now()),('loyalty_card_id','=',self.id)]
        
#        print('upoints',self.env['loyalty.card.unpoint'].search(domain))
        return sum(self.env['loyalty.card.unpoint'].search([('start_date','<=',fields.Datetime.now()),('expire_date','>=',fields.Datetime.now()),('loyalty_card_id','=',self.id)]).mapped('remaining_point'))
    
    def update_points(self):
        for rec in self:
            rec.with_context(no_update=1).points = sum(self.env['loyalty.card.unpoint'].search([('start_date','<=',fields.Datetime.now()),('expire_date','>=',fields.Datetime.now()),('loyalty_card_id','=',rec.id)]).mapped('remaining_point'))
    
