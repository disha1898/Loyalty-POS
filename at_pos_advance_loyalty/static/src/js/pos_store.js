/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import "@pos_loyalty/overrides/models/pos_store";
import { PosStore } from "@point_of_sale/app/store/pos_store";
import { _t } from "@web/core/l10n/translation";
import { Domain, InvalidDomainError } from "@web/core/domain";
import { PosLoyaltyCard } from "@pos_loyalty/overrides/models/loyalty";
const COUPON_CACHE_MAX_SIZE = 4096; // Maximum coupon cache size, prevents long run memory issues and (to some extent) invalid data

patch(PosStore.prototype, {
    
//    async fetchLoyaltyCard(programId, partnerId) {
//        await this.fetchCoupons([
//            ["partner_id", "=", partnerId],
//            ["program_id", "=", programId],
//        ]);
//        for (const coupon of Object.values(this.couponCache)) {
//            if (coupon.partner_id === partnerId && coupon.program_id === programId) {
//                return coupon;
//            }
//        }
//        const fetchedCoupons = await this.fetchCoupons([
//            ["partner_id", "=", partnerId],
//            ["program_id", "=", programId],
//        ]);
//        const dbCoupon = fetchedCoupons.length > 0 ? fetchedCoupons[0] : null;
//        return dbCoupon || new PosLoyaltyCard(null, null, programId, partnerId, 0);
//    },
//    
//    async fetchCoupons(domain, limit = 1) {
//        const result = await this.env.services.orm.searchRead(
//            "loyalty.card",
//            domain,
//            ["id", "compute_points", "code", "partner_id", "program_id", "expiration_date"],
//            { limit }
//        );
//        if (Object.keys(this.couponCache).length + result.length > COUPON_CACHE_MAX_SIZE) {
//            this.couponCache = {};
//            this.partnerId2CouponIds = {};
//            // Make sure that the current order has no invalid data.
//            if (this.selectedOrder) {
//                this.selectedOrder.invalidCoupons = true;
//            }
//        }
//        const couponList = [];
//        for (const dbCoupon of result) {
//        console.log("-dbCoupon-",dbCoupon)
//            const coupon = new PosLoyaltyCard(
//                dbCoupon.code,
//                dbCoupon.id,
//                dbCoupon.program_id[0],
//                dbCoupon.partner_id[0],
//                dbCoupon.compute_points,
//                dbCoupon.expiration_date
//            );
//            this.couponCache[coupon.id] = coupon;
//            this.partnerId2CouponIds[coupon.partner_id] =
//                this.partnerId2CouponIds[coupon.partner_id] || new Set();
//            this.partnerId2CouponIds[coupon.partner_id].add(coupon.id);
//            couponList.push(coupon);
//        }
//        return couponList;
//    },
    
})
