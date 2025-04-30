# -*- coding: utf-8 -*-

{
    'name': 'POS Loyalty Management',
    'version': '17.0',
    'category': 'Sales/Point of Sale',
    'summary': 'POS Loyalty Management',
    'website':"https://ativeg.tech",
    'author': 'Ativeg Technology',
    'support': 'info@ativeg.tech',
    'installable': True,
    'application': True,
    'depends': ['pos_loyalty', 'sale'],
    'data': [
        'security/ir.model.access.csv',
        'views/loyalty_card_view.xml',
        ],
    'assets':{
        'point_of_sale._assets_pos': [
            'at_pos_advance_loyalty/static/src/**/*',
        ],
    },
    'application': True,
    'license': "OPL-1",
}
