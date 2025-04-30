from odoo import fields, models, _, api
from datetime import datetime

class LoyaltyCardUnpoint(models.Model):
    _name = "loyalty.card.unpoint"
    _description = "Loyalty Card Unpoint"

    name = fields.Char("Name")
    loyalty_card_id = fields.Many2one("loyalty.card", string="Loyalty Card")
    loyalty_point = fields.Float("Loyalty Point")
    remaining_point = fields.Float("Remaning Point")
    start_date = fields.Datetime("Start Date")
    expire_date = fields.Datetime("Expire Date")
    pos_order_id = fields.Many2one('pos.order',string="Order")
    order_tracking_number = fields.Char(string="Order")
    
