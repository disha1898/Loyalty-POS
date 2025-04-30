/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { Orderline } from "@point_of_sale/app/store/models";

patch(Orderline.prototype, {

    setup(){
        super.setup(...arguments);
        this.refunded_loyalty_points = this.refunded_loyalty_points || 0;
        this.refunded_loyalty_earn_points = this.refunded_loyalty_earn_points || 0;
    },
    
    //@override
    export_as_JSON() {
        const json = super.export_as_JSON(...arguments);
        json.refunded_loyalty_points = this.refunded_loyalty_points;
        json.refunded_loyalty_earn_points = this.refunded_loyalty_earn_points;
        return json;
    },
    //@override
    init_from_JSON(json) {
        super.init_from_JSON(...arguments);
        this.refunded_loyalty_points = json.refunded_loyalty_points;
        this.refunded_loyalty_earn_points = json.refunded_loyalty_earn_points;
    },
    
    set_refunded_loyalty_points(val){
        this.refunded_loyalty_points = val
    },
    

})
