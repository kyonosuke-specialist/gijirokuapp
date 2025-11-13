## WebUIで実現したい機能
- 音声ファイルのアップロード
  - すでに実現済み
- ファイル編集処理の進捗状況
  - 現状は「処理中...」から動かない状態。裏側のS3にはアップロードされているので表示ができていない。DynamoDBで情報取得の想定。
- ファイルのダウンロード
  - 要約データ、感情分析データ、文字起こしデータをそれぞれ個別にダウンロードできるようにダウンロードボタンを複数作成する
  - ファイルをダウンロードしようとすると以下のエラーが発生する。
  - DynamoDBがエラーとなりアプリの動作を妨げている気がします。なので一旦DynamoDBは利用しないことにしましょう。処理の進捗状況は可視化する必要はないので、シンプルにデータのアップロードとダウンロードができるようにしてください。
  ```
  S3ファイル取得エラー: NoSuchKey: The specified key does not exist.
    at constructor.extractError (aws-sdk-2.1000.0.min.js:87:14480)
    at constructor.callListeners (aws-sdk-2.1000.0.min.js:86:16688)
    at constructor.emit (aws-sdk-2.1000.0.min.js:86:16399)
    at constructor.emitEvent (aws-sdk-2.1000.0.min.js:86:2059)
    at constructor.e (aws-sdk-2.1000.0.min.js:85:29652)
    at i.runTo (aws-sdk-2.1000.0.min.js:88:8526)
    at aws-sdk-2.1000.0.min.js:88:8731
    at constructor.<anonymous> (aws-sdk-2.1000.0.min.js:85:29862)
    at constructor.<anonymous> (aws-sdk-2.1000.0.min.js:86:2114)
    at constructor.callListeners (aws-sdk-2.1000.0.min.js:86:16794)
  ```

## S3バケット
- ファイル出力用S3バケット
  - minutes-app-team-a-backet 
    - output-bedrock/
    - output-conprehend/
    - output-transcribe/