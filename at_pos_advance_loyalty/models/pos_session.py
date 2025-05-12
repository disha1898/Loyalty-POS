# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import _, models,api,fields
import logging
_logger = logging.getLogger(__name__)

class PosSession(models.Model):
    _inherit = 'pos.session'
    
    def _loader_params_loyalty_program(self):
        result = super(PosSession,self)._loader_params_loyalty_program()
        result["search_params"]["fields"].append("minimum_usage_points")
        return result
