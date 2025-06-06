/** @odoo-module **/

import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { patch } from "@web/core/utils/patch";

patch(PaymentScreen.prototype, {
    async afterOrderValidation(suggestToSync = true) {
    //---remaining points calculated after claiming the reward is shown in the redemption history
        const res = super.afterOrderValidation(...arguments);
        console.log("=-=-this.pos.get_order().pointsCost",this.pos.get_order().pointsCost)
        if(this.pos.get_order().pointsCost != undefined){
            const order = this.pos.get_order()
            const coupon = order.selectedCoupon
            let pointsOfPartner = 0
             if (order.partner && Array.isArray(order.partner.loyalty_cards)) {
            const loyaltyCard = order.partner.loyalty_cards[coupon];
            if (loyaltyCard && loyaltyCard.points !== undefined) {
                pointsOfPartner += loyaltyCard.points;
            }
        }
            const pointsWon = order.couponPointChanges?.[coupon]?.points || 0;
            const pointsSpent = order.pointsCost
            console.log("=-=-order.pointsCost=--=",order.pointsCost)
            const balance = pointsOfPartner + pointsWon - pointsSpent
            const token = order.access_token
            const remaining_points = this.env.services.orm.call('pos.order.line','remaining_points',[[balance],[token]])
        }
        return res
    },
});
