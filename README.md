# Bank account FPE
這是一個用來加密銀行帳戶資訊的 chrome extension. 在加密的同時保持輸入資料的格式。
## 演算法
KDF：SHA-256
Integer FPE： prefix cipher
文字 FPE： FF3-1

對於身份證字號而言：
1. 得到 A部分 = ID[0:3] ，B部分 = ID[4:10]
2. A部分做 FF3-1(radix = 36)，B部分做 FF3-1(radix = 10)
3. cycle-walking
