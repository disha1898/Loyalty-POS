from odoo import fields, models, _, api

class LoyaltyCardHistory(models.Model):
    _name = "loyalty.card.history"
    _description = "Loyalty Card History"

    name = fields.Char("Name")
    loyalty_card_id = fields.Many2one("loyalty.card", string="Loyalty Card")
    used_points = fields.Float(string="Used Points")
