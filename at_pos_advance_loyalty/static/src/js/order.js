/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { Order } from "@point_of_sale/app/store/models";

function _newRandomRewardCode() {
    return (Math.random() + 1).toString(36).substring(3);
}

patch(Order.prototype, {
    
    setup(){
        super.setup(...arguments);
        this.refunded_loyalty_earn_points = this.refunded_loyalty_earn_points || 0;
    },
    
    //@override
    export_as_JSON() {
        const json = super.export_as_JSON(...arguments);
        json.refunded_loyalty_earn_points = this.refunded_loyalty_earn_points;
        return json;
    },
    //@override
    init_from_JSON(json) {
        super.init_from_JSON(...arguments);
        this.refunded_loyalty_earn_points = json.refunded_loyalty_earn_points;
    },
    
    set_refunded_loyalty_earn_points(val){
        this.refunded_loyalty_earn_points = val
    },
    
    getRefundLoyaltyPoints(){
        var result = {won:this.refunded_loyalty_earn_points,loss:0}
        var extra_used_points = 0
        for (const line of Object.values(this.orderlines)) {
            result['loss'] += line.refunded_loyalty_points
        }
        return result
    },
//    
    _getRealCouponPoints(coupon_id) {
        let points = 0;
        const dbCoupon = this.pos.couponCache[coupon_id];
        if (dbCoupon) {
            points += dbCoupon.balance;
        }
        Object.values(this.couponPointChanges).some((pe) => {
            if (pe.coupon_id === coupon_id) {
                if (this.pos.program_by_id[pe.program_id].applies_on !== "future" && this.pos.program_by_id[pe.program_id].program_type !== "loyalty") {
                    points += pe.points;
                }
                // couponPointChanges is not supposed to have a coupon multiple times
                return true;
            }
            return false;
        });
        for (const line of this.get_orderlines()) {
            if (line.is_reward_line && line.coupon_id === coupon_id) {
                points -= line.points_cost;
            }
        }
        return points;
    },
    
    _getRewardLineValuesDiscount(args){
        console.log("-=args",args)
        if (args.reward.discount_mode == "per_point" && args.reward.reward_type == 'discount' && args.reward.program_id.program_type == 'loyalty'){
            return this._getCustomRewardLineValuesDiscount(args)
        }
        else {
            return super._getRewardLineValuesDiscount(...arguments)
        }
        
    },
//    
    _getCustomRewardLineValuesDiscount(args) {
        const reward = args["reward"];
        const coupon_id = args["coupon_id"];
        const rewardAppliesTo = reward.discount_applicability;
        let getDiscountable;
        if (rewardAppliesTo === "order") {
            getDiscountable = this._getDiscountableOnOrder.bind(this);
        } else if (rewardAppliesTo === "cheapest") {
            getDiscountable = this._getDiscountableOnCheapest.bind(this);
        } else if (rewardAppliesTo === "specific") {
            getDiscountable = this._getDiscountableOnSpecific.bind(this);
        }
        if (!getDiscountable) {
            return _t("Unknown discount type");
        }
        let { discountable, discountablePerTax } = getDiscountable(reward);
        discountable = Math.min(this.get_total_with_tax(), discountable);
        if (!discountable) {
            return [];
        }
        let maxDiscount = reward.discount_max_amount || Infinity;
        maxDiscount = Math.min(
            maxDiscount,
            reward.discount * args["cost"]
        );
        const rewardCode = _newRandomRewardCode();
        console.log("=-=reward-=",reward)
        let pointCost = reward.clear_wallet
            ? this._getRealCouponPoints(coupon_id)
            : reward.required_points;
        console.log("=11-=-pointCost",pointCost)
        console.log("=11-=-maxDiscount",maxDiscount)
        if (reward.discount_mode === "per_point" && !reward.clear_wallet) {
            pointCost = Math.min(maxDiscount, discountable) / reward.discount;
            console.log("=22-=-pointCost",pointCost)
            console.log("=22-=-maxDiscount",maxDiscount)
            console.log("=22-=-discountable",discountable)
        }
        console.log("=-=-pointCost",pointCost)
        // These are considered payments and do not require to be either taxed or split by tax
        const discountProduct = reward.discount_line_product_id;
        const discountFactor = discountable ? Math.min(1, maxDiscount / discountable) : 1;
        const result = Object.entries(discountablePerTax).reduce((lst, entry) => {
            // Ignore 0 price lines
            if (!entry[1]) {
                return lst;
            }
            const taxIds = entry[0] === "" ? [] : entry[0].split(",").map((str) => parseInt(str));
            lst.push({
                product: discountProduct,
                price: -(entry[1] * discountFactor),
                quantity: 1,
                reward_id: reward.id,
                is_reward_line: true,
                coupon_id: coupon_id,
                points_cost: 0,
                reward_identifier_code: rewardCode,
                tax_ids: taxIds,
                merge: false,
            });
            return lst;
        }, []);
        if (result.length) {
            result[0]["points_cost"] = pointCost;
        }
        return result;
    },
    
//    pointsForPrograms(programs){
//        var result = super.pointsForPrograms(...arguments);
//        var line = this.get_orderlines().find(line => line.giftBarcode);
//        var loyaltyprograms = programs.find(program => program.program_type == 'loyalty')
//        if (line){
//            result[loyaltyprograms.id] = [{points:0}];
//            return result
//        }
//        else{
//            return result
//        }
//    },
//    
//    async _updatePrograms() {
//        const changesPerProgram = {};
//        const programsToCheck = new Set();
//        // By default include all programs that are considered 'applicable'
//        for (const program of this.pos.programs) {
//            if (this._programIsApplicable(program)) {
//                programsToCheck.add(program.id);
//            }
//        }
//        console.log("--this.couponPointChanges",this.couponPointChanges)
//        for (const pe of Object.values(this.couponPointChanges)) {
//            if (!changesPerProgram[pe.program_id]) {
//                changesPerProgram[pe.program_id] = [];
//                programsToCheck.add(pe.program_id);
//            }
//            changesPerProgram[pe.program_id].push(pe);
//        }
//        for (const coupon of this.codeActivatedCoupons) {
//            programsToCheck.add(coupon.program_id);
//        }
//        const programs = [...programsToCheck].map((programId) => this.pos.program_by_id[programId]);
//        const pointsAddedPerProgram = this.pointsForPrograms(programs);
//        for (const program of this.pos.programs) {
//            // Future programs may split their points per unit paid (gift cards for example), consider a non applicable program to give no points
//            const pointsAdded = this._programIsApplicable(program)
//                ? pointsAddedPerProgram[program.id]
//                : [];
//            console.log("=-=-=program",program,pointsAdded)
//            // For programs that apply to both (loyalty) we always add a change of 0 points, if there is none, since it makes it easier to
//            //  track for claimable rewards, and makes sure to load the partner's loyalty card.
//            if ((program.program_type == 'loyalty' || program.is_nominative) && !pointsAdded.length && this.get_partner()) {
//                pointsAdded.push({ points: 0 });
//            }
//            const oldChanges = changesPerProgram[program.id] || [];
//            // Update point changes for those that exist
//            for (let idx = 0; idx < Math.min(pointsAdded.length, oldChanges.length); idx++) {
//                Object.assign(oldChanges[idx], pointsAdded[idx]);
//            }
//            if (pointsAdded.length < oldChanges.length) {
//                const removedIds = oldChanges.map((pe) => pe.coupon_id);
//                this.couponPointChanges = Object.fromEntries(
//                    Object.entries(this.couponPointChanges).filter(([k, pe]) => {
//                        return !removedIds.includes(pe.coupon_id);
//                    })
//                );
//            } else if (pointsAdded.length > oldChanges.length) {
//                for (const pa of pointsAdded.splice(oldChanges.length)) {
//                    const coupon = await this._couponForProgram(program);
//                    this.couponPointChanges[coupon.id] = {
//                        points: pa.points,
//                        program_id: program.id,
//                        coupon_id: coupon.id,
//                        barcode: pa.barcode,
//                        appliedRules: pointsForProgramsCountedRules[program.id],
//                    };
//                }
//            }
//        }
//        // Also remove coupons from codeActivatedCoupons if their program applies_on current orders and the program does not give any points
//        this.codeActivatedCoupons = this.codeActivatedCoupons.filter((coupon) => {
//            const program = this.pos.program_by_id[coupon.program_id];
//            if (
//                program.applies_on === "current" &&
//                pointsAddedPerProgram[program.id].length === 0
//            ) {
//                return false;
//            }
//            return true;
//        });
//    },
//    
//    _computeUnclaimedFreeProductQty(reward, coupon_id, product, remainingPoints) {
//        let claimed = 0;
//        let available = 0;
//        let shouldCorrectRemainingPoints = false;
//        for (const line of this.get_orderlines()) {
//            if (line.get_product().id === product.id) {
//                available += line.get_quantity();
//            } else if (reward.reward_product_ids.includes(line.reward_product_id)) {
//                if (line.reward_id == reward.id) {
//                    remainingPoints += line.points_cost;
//                    claimed += line.get_quantity();
//                } else {
//                    shouldCorrectRemainingPoints = true;
//                }
//            }
//        }
//        let freeQty;
//        if (reward.program_id.trigger == "auto") {
//            if (reward.program_id.program_type == 'loyalty'){
//                freeQty = Math.floor((remainingPoints / reward.required_points) * reward.reward_product_qty);
//            }
//            else if (this._isRewardProductPartOfRules(reward, product) && reward.program_id.applies_on !== 'future') {
//                // OPTIMIZATION: Pre-calculate the factors for each reward-product combination during the loading.
//                // For points not based on quantity, need to normalize the points to compute free quantity.
//                const appliedRulesIds = this.couponPointChanges[coupon_id].appliedRules;
//                const appliedRules =
//                    appliedRulesIds !== undefined
//                        ? reward.program_id.rules.filter((rule) =>
//                              appliedRulesIds.includes(rule.id)
//                          )
//                        : reward.program_id.rules;
//                let factor = 0;
//                let orderPoints = 0;
//                for (const rule of appliedRules) {
//                    if (rule.any_product || rule.valid_product_ids.has(product.id)) {
//                        if (rule.reward_point_mode === "order") {
//                            orderPoints += rule.reward_point_amount;
//                        } else if (rule.reward_point_mode === "money") {
//                            factor += roundPrecision(
//                                rule.reward_point_amount * product.lst_price,
//                                0.01
//                            );
//                        } else if (rule.reward_point_mode === "unit") {
//                            factor += rule.reward_point_amount;
//                        }
//                    }
//                }
//                if (factor === 0) {
//                    freeQty = Math.floor(
//                        (remainingPoints / reward.required_points) * reward.reward_product_qty
//                    );
//                } else {
//                    const correction = shouldCorrectRemainingPoints
//                        ? this._getPointsCorrection(reward.program_id)
//                        : 0;
//                    freeQty = computeFreeQuantity(
//                        (remainingPoints - correction - orderPoints) / factor,
//                        reward.required_points / factor,
//                        reward.reward_product_qty
//                    );
//                    freeQty += Math.floor(
//                        (orderPoints / reward.required_points) * reward.reward_product_qty
//                    );
//                }
//            } else {
//                freeQty = Math.floor(
//                    (remainingPoints / reward.required_points) * reward.reward_product_qty
//                );
//            }
//        } else if (reward.program_id.trigger == "with_code") {
//            freeQty = Math.floor(
//                (remainingPoints / reward.required_points) * reward.reward_product_qty
//            );
//        }
//        return Math.min(available, freeQty) - claimed;
//    },

})
