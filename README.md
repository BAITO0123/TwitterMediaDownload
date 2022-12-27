## 概要
Twitter APIを用いて指定したユーザのツイートから画像を取得・保存するプロジェクトです。

### 前提条件
Twitter APIのベアラートークンを所有していること

## Get Started
1. パッケージのダウンロード
    ```bash
    npm install
    ```

1. .envの編集

1. src/target.jsonの編集  
`{"screen_name": "",　"include_rts": false, "id": ""}`
の部分を繰り返し記載することで複数アカウントの画像を取得するよう設定できます。  

    | 設定項目 | 意味 | 設定値 |
    | ------- | ---- | ------ |
    | screen_name | 各アカウントの@以降の文字列 | 文字列 |
    | includer_rts | リツイートした画像を取得するか否か | boolean |
    | id | アカウント固有のID、後でセットアップするので空文字のままでOK | 文字列 |

1. 以下のコマンドを実行し、target.jsonのidを取得する。
    ```bash
    npm run twitterSetUp
    ```
    ※ target.jsonを変更したら必ずtwitterSetupスクリプトを実行する

1. 以下のコマンドを実行し、デーモン化する
    ```bash
    npm run start
    ```