# -*- coding: utf-8 -*-

{
    'name': 'Loyalty POS',
    'version': '17.0',
    'category': 'Sales/Point of Sale',
    'summary': 'Loyalty POS',
    'installable': True,
    'application': True,
    'depends': ['pos_loyalty', 'sale'],
    'data': [
        'security/ir.model.access.csv',
        'views/loyalty_card_view.xml',
        ],
    'license': 'LGPL-3',
}
