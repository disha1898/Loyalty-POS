/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { patch } from "@web/core/utils/patch";
import { PosLoyaltyCard } from "@pos_loyalty/overrides/models/loyalty";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";

patch(PaymentScreen.prototype, {

    //@override
    async validateOrder(isForceValidate) {
        await super.validateOrder(...arguments);
        
        const pointChanges = {};
        const newCodes = [];
        for (const pe of Object.values(this.currentOrder.couponPointChanges)) {
            if (pe.coupon_id > 0) {
                pointChanges[pe.coupon_id] = pe.points;
            } else if (pe.barcode && !pe.giftCardId) {
                // New coupon with a specific code, validate that it does not exist
                newCodes.push(pe.barcode);
            }
        }
        const newpointChanges = {};
        for (const line of this.currentOrder._get_reward_lines()) {
            if (line.coupon_id < 1) {
                continue;
            }
            if (!newpointChanges[line.coupon_id]) {
                newpointChanges[line.coupon_id] = -line.points_cost;
            } else {
                newpointChanges[line.coupon_id] -= line.points_cost;
            }
        }
        console.log("-=-=pointChanges=-=-",pointChanges)
        console.log("-=-=newpointChanges=-=-",newpointChanges)
        // No need to do an rpc if no existing coupon is being used.
        if (Object.keys(pointChanges || {}).length > 0 || Object.keys(newpointChanges || {}).length > 0) {
            try {
                await this.orm.call(
                    "pos.order",
                    "loyalty_points_validation",
                    [[], pointChanges, newpointChanges]
                );
            } catch {
                // Do nothing with error, while this validation step is nice for error messages
                // it should not be blocking.
            }
        }
        
    },

})
