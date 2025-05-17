/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { patch } from "@web/core/utils/patch";
import { PosLoyaltyCard } from "@pos_loyalty/overrides/models/loyalty";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";

patch(PaymentScreen.prototype, {

    //@override
    async validateOrder(isForceValidate) {
        var pointChanges = {};
        var newCodes = [];
        for (var pe of Object.values(this.currentOrder.couponPointChanges)) {
            if (pe.coupon_id > 0) {
                pointChanges[pe.coupon_id] = pe.points;
            } else if (pe.barcode && !pe.giftCardId) {
                // New coupon with a specific code, validate that it does not exist
                newCodes.push(pe.barcode);
            }
        }
        for (var line of this.currentOrder._get_reward_lines()) {
            if (line.coupon_id < 1) {
                continue;
            }
            if (!pointChanges[line.coupon_id]) {
                pointChanges[line.coupon_id] = -line.points_cost;
            } else {
                pointChanges[line.coupon_id] -= line.points_cost;
            }
        }
        if (!(await this._isOrderValid(isForceValidate))) {
            return;
        }
        // No need to do an rpc if no existing coupon is being used.
        if (Object.keys(pointChanges || {}).length > 0 || newCodes.length) {
            try {
                var { successful, payload } = await this.orm.call(
                    "pos.order",
                    "validate_coupon_programs",
                    [[], pointChanges, newCodes]
                );
                // Payload may contain the points of the concerned coupons to be updated in case of error. (So that rewards can be corrected)
                var { couponCache } = this.pos;
                if (payload && payload.updated_points) {
                    for (var pointChange of Object.entries(payload.updated_points)) {
                        if (couponCache[pointChange[0]]) {
                            couponCache[pointChange[0]].balance = pointChange[1];
                        }
                    }
                }
                if (payload && payload.removed_coupons) {
                    for (var couponId of payload.removed_coupons) {
                        if (couponCache[couponId]) {
                            delete couponCache[couponId];
                        }
                    }
                    this.currentOrder.codeActivatedCoupons =
                        this.currentOrder.codeActivatedCoupons.filter(
                            (coupon) => !payload.removed_coupons.includes(coupon.id)
                        );
                }
                if (!successful) {
                    this.popup.add(ErrorPopup, {
                        title: _t("Error validating rewards"),
                        body: payload.message,
                    });
                    return;
                }
            } catch {
                // Do nothing with error, while this validation step is nice for error messages
                // it should not be blocking.
            }
        }
        var pointChanges = {};
        var NewpointChanges = [];
        var newCodes = [];
        for (var pe of Object.values(this.currentOrder.couponPointChanges)) {
            if (pe.coupon_id > 0) {
                pointChanges[pe.coupon_id] = pe.points;
            } else{
                // New coupon with a specific code, validate that it does not exist
                NewpointChanges.push(pe);
            }
        }
        var newpointChanges = {};
        for (var line of this.currentOrder._get_reward_lines()) {
            if (line.coupon_id < 1) {
                continue;
            }
            if (!newpointChanges[line.coupon_id]) {
                newpointChanges[line.coupon_id] = -line.points_cost;
            } else {
                newpointChanges[line.coupon_id] -= line.points_cost;
            }
        }
        var refunded_loyalty_points_loss = Object.values(this.currentOrder.orderlines).reduce((total, line) => total + line.refunded_loyalty_points, 0);
        var refunded_loyalty_points_earn = this.currentOrder.refunded_loyalty_earn_points
        var order_id = this.currentOrder
        console.log("-=-=currentOrder=-=-",order_id.trackingNumber)
        console.log("-=-=order_id=-=-",order_id)
        console.log("-=-=pointChanges=-=-",pointChanges)
        console.log("-=-=newpointChanges=-=-",newpointChanges)
        console.log("-=-=-=refunded_loyalty_points",refunded_loyalty_points_loss)
        console.log("-=-=-=refunded_loyalty_points_earn",order_id,refunded_loyalty_points_earn)
        // No need to do an rpc if no existing coupon is being used.
        if (Object.keys(pointChanges || {}).length > 0 || Object.keys(newpointChanges || {}).length > 0 || refunded_loyalty_points_loss || refunded_loyalty_points_earn || Object.keys(NewpointChanges || {}).length > 0) {
//            try {
            await this.orm.call(
                "pos.order",
                "loyalty_points_validation",
                [order_id.server_id, pointChanges, newpointChanges,refunded_loyalty_points_loss,refunded_loyalty_points_earn,order_id.name,NewpointChanges,order_id.partner ? order_id.partner.id : false]
            );
//            } catch {
//                // Do nothing with error, while this validation step is nice for error messages
//                // it should not be blocking.
//            }
        }
        await super.validateOrder(...arguments);
    },

})
