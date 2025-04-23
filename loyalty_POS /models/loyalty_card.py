from odoo import api, models, fields


class LoyaltyCard(models.Model):
    _inherit = 'loyalty.card'

    loyalty_card_unpoint_ids = fields.One2many("loyalty.card.unpoint", "loyalty_card_id")
    loyalty_card_history_ids = fields.One2many("loyalty.card.history", "loyalty_card_id")
