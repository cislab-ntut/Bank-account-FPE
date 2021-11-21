# Bank account FPE
這是一個用來加密銀行帳戶資訊的 chrome extension. 在加密的同時保持輸入資料的格式。

## 演算法
- KeyGen：SHA-256
- Integer FPE： prefix cipher
- 文字 FPE： FF3-1

基本流程：
文字 --> 數字 --> 加密 --> 數字 --> 文字

對於身份證字號而言：
1. 得到 A部分 = ID[0:3] ，B部分 = ID[4:10]
2. A部分做 FF3-1(radix = 36)，B部分做 FF3-1(radix = 10)
3. cycle-walking

## 安裝
開發人員模式 --> 載入未封裝項目 -->　擴充功能資料夾

## 使用
點擊擴充圖示打開網頁。
### 加密
- 網頁填寫
- 從資料庫拿 (送出至/從網址)
- 上傳檔案 (json)
### 解密
- 密文
    - 直接貼 json (加密完在畫面上)
    - 從資料庫拿 (送出至/從網址)
- key
    - 匯入 (加密後有匯出按鈕)
    - 從chrome stroage 拿 (加密勾選儲存)

## 資料來源
銀行資料來自 https://www.banking.gov.tw/ch/home.jsp?id=60&parentpath=0,4&mcustomize=FscSearch_BankType.jsp&type=1
