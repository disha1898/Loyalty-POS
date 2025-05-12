from odoo import api, models, fields

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    otp_expire = fields.Integer(string="OTP Expiry Time (in minutes)", default=10)

    def set_values(self):
        super(ResConfigSettings, self).set_values()
        self.env['ir.config_parameter'].sudo().set_param('loyalty_program.otp_expire', self.otp_expire)

    @api.model
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        otp_expire = int(self.env['ir.config_parameter'].sudo().get_param('loyalty_program.otp_expire', default=10))
        res.update(otp_expire=otp_expire)
        return res
