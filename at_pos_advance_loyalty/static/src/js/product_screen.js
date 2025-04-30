/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";


patch(ProductScreen.prototype, {
    
    async getRefundLoyaltyPoints(){
        var result = {success:false,won:0,loss:0}
        var extra_used_points = 0
        for (const line of Object.values(this.currentOrder.orderlines)) {
            console.log('-=-=lines', line);
            if (line.refunded_orderline_id) {
                extra_used_points += await this.pos.orm.call(
                    "pos.order.line",
                    "get_loyalty_points_refunded",
                    [line.refunded_orderline_id, line.quantity]
                );
                console.log("=-=-extra_used_points", extra_used_points);
            }
        }
        console.log("-=extra_used_points",extra_used_points)
        if (extra_used_points){
            result['loss'] += extra_used_points
            result['success'] = true
        }
        console.log("=-=result",result)
        return result
    },
    
})
