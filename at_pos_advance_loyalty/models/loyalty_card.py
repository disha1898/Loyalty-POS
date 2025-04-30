from odoo import api, models, fields


class LoyaltyCard(models.Model):
    _inherit = 'loyalty.card'

    loyalty_card_unpoint_ids = fields.One2many("loyalty.card.unpoint", "loyalty_card_id")
    loyalty_card_history_ids = fields.One2many("loyalty.card.history", "loyalty_card_id")
    compute_points = fields.Float(tracking=True,compute='_compute_points_display')
    points_display = fields.Char(compute='_compute_points_display')

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
    
