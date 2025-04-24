/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { RewardButton } from "@pos_loyalty/app/control_buttons/reward_button/reward_button";

patch(RewardButton.prototype, {

    _getPotentialRewards(){
        var rewards = super._getPotentialRewards(...arguments);

        var frewards = rewards.filter((coupon) => {
            if (coupon.reward.program_id.program_type == 'loyalty'){
                return false
            }
            return true
        })

        return frewards
    }

})
