"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const twitter_api_sdk_1 = __importDefault(require("twitter-api-sdk"));
const target_json_1 = __importDefault(require("./target.json"));
dotenv_1.default.config();
const client = new twitter_api_sdk_1.default(process.env.TWITTER_BEARER_TOKEN);
const setTwitterTarget = async () => {
    const result = [];
    const errorUserNames = [];
    for (const target of target_json_1.default) {
        if (target['id']) {
            result.push(target);
        }
        else {
            try {
                const user = await client.users.findUserByUsername(target['screen_name'], {
                    "user.fields": [
                        "id"
                    ]
                });
                if (!user['data']) {
                    throw {};
                }
                target['id'] = user['data']['id'];
                result.push(target);
            }
            catch {
                result.push(target);
                errorUserNames.push(target['screen_name']);
            }
        }
    }
    if (errorUserNames.length) {
        console.log("以下のユーザ情報が正しく取得できませんでした。");
        for (const name of errorUserNames) {
            console.log(name);
        }
    }
    try {
        fs_1.default.writeFileSync("src/target.json", JSON.stringify(result, null, 4));
    }
    catch (e) {
        console.log(e);
    }
};
setTwitterTarget();
//# sourceMappingURL=twitterTarget.js.map