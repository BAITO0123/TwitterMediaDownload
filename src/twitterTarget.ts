import dotenv from 'dotenv';
import fs from 'fs';
import Client from 'twitter-api-sdk';
import targetArray from './target.json';
dotenv.config();

const client: Client = new Client(process.env.TWITTER_BEARER_TOKEN as string);

const setTwitterTarget = async () => {
    const result = [];
    const errorUserNames: string[] = []
    for (const target of targetArray) {
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
        fs.writeFileSync("src/target.json", JSON.stringify(result, null, 4));
    }
    catch(e) {
        console.log(e);
    }
}

setTwitterTarget();