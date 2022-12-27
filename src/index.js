"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const target_json_1 = __importDefault(require("./target.json"));
const axios_1 = __importDefault(require("axios"));
const node_cron_1 = __importDefault(require("node-cron"));
const twitter_api_sdk_1 = require("twitter-api-sdk");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const client = new twitter_api_sdk_1.Client(process.env.TWITTER_BEARER_TOKEN);
const getTwitterMediaURL = async (userId, sinceDate, untilDate, excludeRetweets) => {
    const mediaUrlArray = [];
    let nextToken = "";
    const timelineCondition = {
        "start_time": sinceDate,
        "end_time": untilDate,
        "max_results": 100,
        "exclude": ["replies"],
        "expansions": [
            "attachments.media_keys",
        ],
        "media.fields": [
            "media_key",
            "type",
            "url",
            "variants",
        ]
    };
    if (excludeRetweets) {
        timelineCondition["exclude"].push("retweets");
    }
    do {
        if (nextToken) {
            timelineCondition["pagination_token"] = nextToken;
        }
        try {
            const { data, errors, includes, meta } = await client.tweets.usersIdTweets(userId, timelineCondition);
            if (includes?.['media']) {
                const urlArray = [];
                const medias = includes['media'];
                for (const media of medias) {
                    if (media['type'] === "photo" && media['url']) {
                        urlArray.push(media['url']);
                    }
                    else if (media['type'] === "video" && media['variants']) {
                        urlArray.push(media['variants'].filter(vari => vari['bit_rate']).sort((var1, var2) => var2['bit_rate'] - var1['bit_rate'])[0]['url']);
                    }
                }
                mediaUrlArray.push(...urlArray);
            }
            nextToken = meta?.['next_token'];
        }
        catch {
            return mediaUrlArray;
        }
    } while (nextToken);
    return mediaUrlArray;
};
const downloadMedia = async (urlArray, query, date) => {
    const config = { responseType: 'arraybuffer' };
    const rootPath = process.env.FILE_PATH_ROOT ? process.env.FILE_PATH_ROOT : "/";
    const rootdir = `${rootPath}/${query}`;
    if (!fs_1.default.existsSync(rootdir)) {
        fs_1.default.mkdirSync(rootdir);
    }
    let cnt = 0;
    for (const url of urlArray) {
        try {
            const { data, headers } = await axios_1.default.get(url, config);
            if (data && headers['content-type']) {
                fs_1.default.writeFileSync(`${rootdir}/${query}_${date.replace(/\//g, "")}_${cnt}.${headers['content-type'].split("/")[1]}`, data);
            }
            cnt++;
        }
        catch (e) {
            console.log(e);
            continue;
        }
    }
};
node_cron_1.default.schedule("0 5 0 * * *", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    for (const info of target_json_1.default) {
        if (!info['id']) {
            continue;
        }
        const mediaURLs = await getTwitterMediaURL(info['id'], yesterday.toISOString(), today.toISOString(), !info['include_rts']);
        await downloadMedia(mediaURLs, info['screen_name'], yesterday.toLocaleDateString());
    }
});
//# sourceMappingURL=index.js.map