import targetArray from './target.json'
import axios, { AxiosRequestConfig } from 'axios';
import cron from 'node-cron';
import { Client } from 'twitter-api-sdk';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

// TwitterAPIのクライアント、ベアラートークンで認証を行う。
const client: Client = new Client(process.env.TWITTER_BEARER_TOKEN as string);

// 関数に渡すオプション情報の型
type TimelineCondition =  {
    start_time?: string,
    end_time?: string,
    max_results: number,
    exclude: ("replies" | "retweets")[]
    pagination_token?: string,
    expansions?: ExpansionParam[],
    "media.fields"?: MediaFileds[]
}

// 追加パラメータのフィールド
type ExpansionParam = "attachments.media_keys" | "attachments.poll_ids" | "author_id" | "edit_history_tweet_ids" | "entities.mentions.username" | "geo.place_id" | "in_reply_to_user_id" | "referenced_tweets.id" | "referenced_tweets.id.author_id";

// メディアオブジェクトのフィールド
type MediaFileds = "alt_text" | "duration_ms" | "height" | "media_key" | "preview_image_url" | "public_metrics" | "type" | "url" | "variants" | "width";

// メディアオブジェクト
type Media = {
    height?: number,
    media_key?: string,
    type: string,
    width?: number,
    url?: string,
    preview_image_url?: string,
    public_metrics?: { view_count?: number},
    variants?: VideoVariants[]
}

// 動画の取得結果
type VideoVariants = {
    bit_rate: number,
    content_type: string,
    url: string
}

/**
 * TwitterアカウントIDを受け取って指定期間内の画像URLの配列を返します。
 */
const getTwitterMediaURL = async (userId: string, sinceDate: string, untilDate: string, excludeRetweets: boolean) => {
    const mediaUrlArray: string[] = [];
    let nextToken: string | undefined = "";
    const timelineCondition: TimelineCondition = {
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
    }
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
                const urlArray: string[] = [];
                const medias: Media[] = includes['media'];
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
        } catch {
            // エラーが起きたらとりあえず取れた分だけ返す
            return mediaUrlArray;
        }
    }
    // データが取得できる限り取り続ける
    while(nextToken)

    return mediaUrlArray;
}

/**
 * 画像URLから画像を取得し、既定のフォルダへ保存します。
 */
const downloadMedia = async (urlArray: string[], query: string, date: string) => {
    const config: AxiosRequestConfig = { responseType: 'arraybuffer' };
    const rootPath = process.env.FILE_PATH_ROOT ? process.env.FILE_PATH_ROOT : "/";
    const rootdir = `${rootPath}/${query}`;

    if(!fs.existsSync(rootdir)) {
        fs.mkdirSync(rootdir);
    }
    let cnt = 0;
    for(const url of urlArray) {
        try {
            const { data, headers } = await axios.get(url, config);
            if (data && headers['content-type']) {
                fs.writeFileSync(`${rootdir}/${query}_${date.replace(/\//g, "")}_${cnt}.${headers['content-type'].split("/")[1]}`, data);
            }
            cnt++;
        }
        catch (e) {
            console.log(e);
            continue;
        }
    }
}

/**
 * 毎日0時5分に定期実行します。
 * 
 */
cron.schedule("0 5 0 * * *", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    for(const info of targetArray) {
        if (!info['id']) {
            continue;
        }
        const mediaURLs: string[] = await getTwitterMediaURL(info['id'], yesterday.toISOString(), today.toISOString(), !info['include_rts']);
        await downloadMedia(mediaURLs, info['screen_name'], yesterday.toLocaleDateString());
    }
});