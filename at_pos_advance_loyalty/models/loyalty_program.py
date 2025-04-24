from odoo import api, models, fields


class LoyaltyProgram(models.Model):
    _inherit = 'loyalty.program'
    
    @api.model
    def create(self,vals):
        records = super(LoyaltyProgram,self).create(vals)
        records.filtered(lambda x:x.program_type == 'loyalty').write({'applies_on':'future','trigger':'with_code'})
        return records
