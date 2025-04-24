from odoo import fields, models, _, api
from datetime import datetime

class LoyaltyCardUnpoint(models.Model):
    _name = "loyalty.card.unpoint"
    _description = "Loyalty Card Unpoint"

    # name = fields.Char("Naae")
    loyalty_card_id = fields.Many2one("loyalty.card", string="Loyalty Card")
    loyalty_point = fields.Float("Loyalty Point")
    start_date = fields.Datetime("Start Date")
    expire_date = fields.Datetime("Expire Date")
