/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { TicketScreen } from "@point_of_sale/app/screens/ticket_screen/ticket_screen";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";

patch(TicketScreen.prototype, {

    async onDoRefund() {
        const oldOrder = this.getSelectedOrder();
    //---------to get the points cost from the reward lines
        await super.onDoRefund(...arguments);
        const order = this.pos.get_order();
        console.log("=-=-=order.orderlines",order.orderlines)
        for (const line of Object.values(order.orderlines)) {
            if (line.refunded_orderline_id) {
                var extra_used_points = await this.pos.orm.call(
                    "pos.order.line",
                    "get_loyalty_points_refunded",
                    [line.refunded_orderline_id, line.quantity]
                );
                line.set_refunded_loyalty_points(extra_used_points)
            }
        }
        var extra_earn_points = 0
        for (const line of Object.values(oldOrder.orderlines)){
            if (line.is_reward_line){
                extra_earn_points += line.points_cost
            }
        }
        order.set_refunded_loyalty_earn_points(extra_earn_points)
    },
    
    _onUpdateSelectedOrderline({ key, buffer }) {
        //---prevent the rewarded to line to get refunded
        const order = this.getSelectedOrder();
        if (!order) {
            return this.numberBuffer.reset();
        }
        const selectedOrderlineId = this.getSelectedOrderlineId();
        const orderline = order.orderlines.find((line) => line.id == selectedOrderlineId);
        if (!orderline) {
            return this.numberBuffer.reset();
        }
        const toRefundDetails = orderline
            .getAllLinesInCombo()
            .map((line) => this._getToRefundDetail(line));
        for (const toRefundDetail of toRefundDetails) {
            if (toRefundDetail.destinationOrderUid) {
                return this.numberBuffer.reset();
            }
            const refundableQty =
                toRefundDetail.orderline.qty - toRefundDetail.orderline.refundedQty;
            if (refundableQty <= 0) {
                return this.numberBuffer.reset();
            }
            if (buffer == null || buffer == "") {
                toRefundDetail.qty = 0;
            } else {
                const quantity = Math.abs(parseFloat(buffer));
                console.log("=-=-orderline=-",orderline)
                if(orderline.is_reward_line == true){
                if(quantity > 0){
                    this.popup.add(ErrorPopup, {
                        title: _t("REFUND NOT POSSIBLE"),
                        body: _t(
                            "You cannot refund a rewarded line",
                        ),
                    });
                }
                }
                else{
                if (quantity > refundableQty) {
                    this.numberBuffer.reset();
                    this.popup.add(ErrorPopup, {
                        title: _t("Maximum Exceeded"),
                        body: _t(
                            "The requested quantity to be refunded is higher than the ordered quantity. %s is requested while only %s can be refunded.",
                            quantity,
                            refundableQty
                        ),
                    });
                } else {
                    toRefundDetail.qty = quantity;
                }
                }
            }
        }
    }

})
