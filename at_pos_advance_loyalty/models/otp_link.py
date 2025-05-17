from odoo import models, fields

class OTPLink(models.Model):
    _name = 'otp.link'
    _description = 'OTP Link Record'
    
    name = fields.Char(string="Name")
    otp = fields.Char(string="OTP", required=True)
    loyalty_reference = fields.Many2one('loyalty.program', string="Loyalty Reference")
    partner_id = fields.Many2one('res.partner', string="Customer")
    otp_link_id = fields.Many2one("loyalty.card")
    
    def send_message_sms(self, partner_id=False, condition=''):
        if not (condition):
            return
        sms_template_objs = self.env["eit.sms.template"].search(
        [('condition', '=', condition), ('globally_access', '=', False)])
        for sms_template_obj in sms_template_objs:
            mobile = sms_template_obj._get_partner_mobile(partner_id)
        if mobile:
            sms_template_obj.send_sms_using_template(
            mobile, sms_template_obj, obj=self)
