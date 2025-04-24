/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { useService } from "@web/core/utils/hooks";
import { NumberPopup } from "@point_of_sale/app/utils/input_popups/number_popup";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { Component } from "@odoo/owl";

export class LoyaltyButton extends Component {
    static template = "at_advance_loyalty.LoyaltyButton";

    setup() {
        this.popup = useService("popup");
        this.pos = usePos();
        this.notification = useService("pos_notification");
    }

    /**
     * If rewards are the same, prioritize the one from freeProductRewards.
     * Make sure that the reward is claimable first.
     */
    _mergeFreeProductRewards(freeProductRewards, potentialFreeProductRewards) {
        const result = [];
        for (const reward of potentialFreeProductRewards) {
            if (!freeProductRewards.find((item) => item.reward.id === reward.reward.id)) {
                result.push(reward);
            }
        }
        return freeProductRewards.concat(result);
    }

    _getPotentialRewards() {
        const order = this.pos.get_order();
        // Claimable rewards excluding those from eWallet programs.
        // eWallet rewards are handled in the eWalletButton.
        let rewards = [];
        if (order) {
            const claimableRewards = order.getClaimableRewards();
            rewards = claimableRewards.filter(
                ({ reward }) => reward.program_id.program_type == "loyalty"
            );
        }
        const discountRewards = rewards.filter(({ reward }) => reward.reward_type == "discount");
        const freeProductRewards = rewards.filter(({ reward }) => reward.reward_type == "product");
        const potentialFreeProductRewards = this.pos.getPotentialFreeProductRewards();
        return discountRewards.concat(
            this._mergeFreeProductRewards(freeProductRewards, potentialFreeProductRewards)
        );
    }

    _isDisabled() {}

    hasClaimableRewards() {
        return this._getPotentialRewards().length > 0;
    }

    /**
     * Applies the reward on the current order, if multiple products can be claimed opens a popup asking for which one.
     *
     * @param {Object} reward
     * @param {Integer} coupon_id
     */
    async _applyReward(reward, coupon_id, potentialQty) {
        const order = this.pos.get_order();
        order.disabledRewards.delete(reward.id);

        const args = {};
        if (reward.reward_type === "product" && reward.multi_product) {
            const productsList = reward.reward_product_ids.map((product_id) => ({
                id: product_id,
                label: this.pos.db.get_product_by_id(product_id).display_name,
                item: product_id,
            }));
            const { confirmed, payload: selectedProduct } = await this.popup.add(SelectionPopup, {
                title: _t("Please select a product for this reward"),
                list: productsList,
            });
            if (!confirmed) {
                return false;
            }
            args["product"] = selectedProduct;
        }
        if (
            (reward.reward_type == "product" && reward.program_id.applies_on !== "both") ||
            (reward.program_id.applies_on == "both" && potentialQty)
        ) {
            this.pos.addProductToCurrentOrder(args["product"] || reward.reward_product_ids[0]);
            return true;
        } else {
            const result = order._applyReward(reward, coupon_id, args);
            if (result !== true) {
                // Returned an error
                this.notification.add(result);
            }
            order._updateRewards();
            return result;
        }
    }

    async click() {
        const rewards = this._getPotentialRewards();
        if (rewards.length >= 1) {
            const rewardsList = rewards[0];
            console.log("=-=rewardsList",rewardsList)
            const computePoints = await this.env.services.orm.call(
                    "loyalty.card",
                    "get_custom_points",
                    [[rewardsList.coupon_id]]
                );

            const order = this.pos.get_order();
            
            const { confirmed, payload: selectedReward } = await this.popup.add(NumberPopup, {
                title: computePoints + " points are available",
            });
            if (confirmed) {
//                if (computePoints < selectedReward){
//                    this.env.services.popup.add(ErrorPopup, {
//                        title: _t("Warning"),
//                        body: _t(
//                            "Loyalty points exceed. You can use till " + computePoints + " Points."
//                        ),
//                    });
//                    return false;
//                }
                rewardsList.reward.required_points = selectedReward
                return this._applyReward(
                    rewardsList.reward,
                    rewardsList.coupon_id,
                    rewardsList.potentialQty
                );
            }
        }
        return false;
    }
}

ProductScreen.addControlButton({
    component: LoyaltyButton,
    condition: function () {
        return this.pos.programs.length > 0;
    },
});
