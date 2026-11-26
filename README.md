<div align="center">

<img src="assets/banner.svg" alt="ApexForge - Break it. Forge it. Make it unbreakable." width="100%"/>

<br/>

<img src="frontend/public/logo.png" alt="ApexForge logo" width="230"/>

<br/>

### <img src="assets/icons/shield.svg" height="30" align="absmiddle" alt=""/> A blockchain-based insurance claiming and smart fund disbursement system, tested by live attacks

<br/>

[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-OPEN_SITE-f5b13c?style=for-the-badge&labelColor=07142b)](https://YOUR-VERCEL-LINK)
[![Tests](https://img.shields.io/badge/CONTRACT_TESTS-12_PASSING-35e08f?style=for-the-badge&labelColor=07142b)](#run)
[![Project](https://img.shields.io/badge/SEM_VII-BLOCKCHAIN_MINI_PROJECT-4f8dff?style=for-the-badge&labelColor=07142b)](#what)

![Solidity](https://img.shields.io/badge/Solidity-f5b13c?style=for-the-badge&logo=solidity&logoColor=07142b&labelColor=07142b)
![Hardhat](https://img.shields.io/badge/Hardhat-f5b13c?style=for-the-badge&logo=ethereum&logoColor=f5b13c&labelColor=07142b)
![Node.js](https://img.shields.io/badge/Node.js-f5b13c?style=for-the-badge&logo=nodedotjs&logoColor=f5b13c&labelColor=07142b)
![Express](https://img.shields.io/badge/Express-f5b13c?style=for-the-badge&logo=express&logoColor=f5b13c&labelColor=07142b)
![SQLite](https://img.shields.io/badge/SQLite-f5b13c?style=for-the-badge&logo=sqlite&logoColor=f5b13c&labelColor=07142b)
![React](https://img.shields.io/badge/React-f5b13c?style=for-the-badge&logo=react&logoColor=f5b13c&labelColor=07142b)
![Vite](https://img.shields.io/badge/Vite-f5b13c?style=for-the-badge&logo=vite&logoColor=f5b13c&labelColor=07142b)
![three.js](https://img.shields.io/badge/three.js-f5b13c?style=for-the-badge&logo=threedotjs&logoColor=f5b13c&labelColor=07142b)

<br/>

<a href="#what"><img src="assets/icons/target.svg" height="20" align="absmiddle" alt=""/> <b>What is it</b></a> &nbsp;•&nbsp;
<a href="#how"><img src="assets/icons/flow.svg" height="20" align="absmiddle" alt=""/> <b>How it works</b></a> &nbsp;•&nbsp;
<a href="#attacks"><img src="assets/icons/mask.svg" height="20" align="absmiddle" alt=""/> <b>5 Attack tricks</b></a> &nbsp;•&nbsp;
<a href="#stack"><img src="assets/icons/cube.svg" height="20" align="absmiddle" alt=""/> <b>Tech stack</b></a> &nbsp;•&nbsp;
<a href="#shots"><img src="assets/icons/camera.svg" height="20" align="absmiddle" alt=""/> <b>Screenshots</b></a> &nbsp;•&nbsp;
<a href="#run"><img src="assets/icons/play.svg" height="20" align="absmiddle" alt=""/> <b>Run it</b></a>

</div>

<img src="assets/divider.svg" width="100%" alt=""/>

<a id="what"></a>

## <img src="assets/icons/target.svg" height="30" align="absmiddle" alt=""/> What is ApexForge?

Imagine an insurance company whose **payout fund is run by a smart contract** instead of clerks. A customer files a claim, a manager approves it, and the contract pays out automatically. That is fast and fair, **but only if the contract has no hidden weak spots.**

ApexForge builds **two copies of the same fund** and attacks both, live:

| | <img src="assets/icons/old.svg" height="18" align="absmiddle" alt=""/> Old System | <img src="assets/icons/secured.svg" height="18" align="absmiddle" alt=""/> Secured System |
|---|---|---|
| **Contract** | `VulnerableVault` (v1) | `HardenedVault` (v2) |
| **Locks** | Weak, easy to fool | Rebuilt with 5 safety fixes |
| **Against 5 attacks** | Gets robbed | Blocks every one |
| **Safety score** | **0%** | **100%** |

You watch it happen in a **3D lab**: thieves fly in, notes fly out, shields flash, and every move is read from real blockchain events.

> <img src="assets/icons/info.svg" height="18" align="absmiddle" alt=""/> **Amounts are shown in rupees** (₹1,00,000 per test coin) to keep things simple. The chain underneath is a local practice network, so **no real money ever moves.**

<img src="assets/divider.svg" width="100%" alt=""/>

<a id="how"></a>

## <img src="assets/icons/flow.svg" height="30" align="absmiddle" alt=""/> How it works

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#0b2447','primaryTextColor':'#f4efe4','primaryBorderColor':'#f5b13c','lineColor':'#f5b13c','secondaryColor':'#0b2447','tertiaryColor':'#07142b','fontFamily':'Georgia'}}}%%
flowchart LR
    A(["Customer<br/>files a claim"]) --> B{{"Manager<br/>approves it"}}
    B --> C[("Smart fund<br/>(contract)")]
    C --> D(["Automatic<br/>payout"])
    T(["Thief"]) -. "5 tricks" .-> C
```

**The whole system, end to end:**

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#0b2447','primaryTextColor':'#f4efe4','primaryBorderColor':'#f5b13c','lineColor':'#f5b13c','secondaryColor':'#0b2447','tertiaryColor':'#07142b','fontFamily':'Georgia'}}}%%
flowchart TB
    subgraph CHAIN["Local blockchain (Hardhat)"]
        V1["VulnerableVault v1"]
        V2["HardenedVault v2"]
        AT["AttackerContract"]
    end
    subgraph BACK["Backend (Node.js)"]
        CH["chain.js<br/>talks to the chain"]
        DB[("SQLite<br/>saved runs")]
        API["Express + WebSocket"]
    end
    subgraph FRONT["Frontend (React + three.js)"]
        UI["5 pages"]
        SC["3D lab"]
    end
    CHAIN --> CH
    CH --> DB
    CH --> API
    API -- "live events" --> UI
    UI --> SC
```

<img src="assets/divider.svg" width="100%" alt=""/>

<a id="attacks"></a>

## <img src="assets/icons/mask.svg" height="30" align="absmiddle" alt=""/> The 5 attack tricks

Each trick has a real-life version you already know.

| # | Plain name | Technical name | Real-life version | Old System | Secured System |
|:-:|---|---|---|:-:|:-:|
| 1 | **Repeat-Withdrawal Trick** | Reentrancy | Asking the cashier for the same cash again before the ledger is updated | <img src="assets/icons/robbed.svg" height="18" align="absmiddle" alt=""/> Robbed | <img src="assets/icons/blocked.svg" height="18" align="absmiddle" alt=""/> Blocked |
| 2 | **Fake-Approval Trick** | Broken access control | Stamping APPROVED on your own form | <img src="assets/icons/robbed.svg" height="18" align="absmiddle" alt=""/> Robbed | <img src="assets/icons/blocked.svg" height="18" align="absmiddle" alt=""/> Blocked |
| 3 | **Photocopied-Cheque Trick** | Signature replay | Photocopying a cheque that never expires | <img src="assets/icons/robbed.svg" height="18" align="absmiddle" alt=""/> Robbed | <img src="assets/icons/blocked.svg" height="18" align="absmiddle" alt=""/> Blocked |
| 4 | **Same-Accident Trick** | Double claim | Claiming insurance twice for one accident | <img src="assets/icons/robbed.svg" height="18" align="absmiddle" alt=""/> Robbed | <img src="assets/icons/blocked.svg" height="18" align="absmiddle" alt=""/> Blocked |
| 5 | **Fake-Identity Trick** | `tx.origin` phishing | Using the owner's identity through a middleman | <img src="assets/icons/robbed.svg" height="18" align="absmiddle" alt=""/> Robbed | <img src="assets/icons/blocked.svg" height="18" align="absmiddle" alt=""/> Blocked |

<details>
<summary><img src="assets/icons/search.svg" height="20" align="absmiddle" alt=""/> <b>Click to see how the Secured System stops each one</b></summary>

<br/>

1. **Repeat-Withdrawal** → updates its records first, then pays, and locks the counter while serving someone (a reentrancy guard).
2. **Fake-Approval** → only accepts approvals from the real verifier (the manager).
3. **Photocopied-Cheque** → every payout slip has a one-time serial number (a nonce) and an expiry date.
4. **Same-Accident** → records every incident number, so one accident means one payout.
5. **Fake-Identity** → checks who is directly asking (`msg.sender`), not who started the chain of actions (`tx.origin`).

</details>

> <img src="assets/icons/alert.svg" height="18" align="absmiddle" alt=""/> **Real life:** in 2016, a blockchain fund called *The DAO* lost tens of millions of dollars to trick number 1.

<img src="assets/divider.svg" width="100%" alt=""/>

<a id="features"></a>

## <img src="assets/icons/bolt.svg" height="30" align="absmiddle" alt=""/> Features

- <img src="assets/icons/cube.svg" height="20" align="absmiddle" alt=""/> **3D live lab** with glowing vaults, a force-field shield, a thief drone, flying banknotes, sparks and shockwaves
- <img src="assets/icons/bolt.svg" height="20" align="absmiddle" alt=""/> **Real-time** behaviour: every effect is triggered by a real blockchain event over WebSocket
- <img src="assets/icons/layers.svg" height="20" align="absmiddle" alt=""/> **5 pages:** Start Here, Live Lab, The 5 Tricks, Replay, Claims Ledger
- <img src="assets/icons/rewind.svg" height="20" align="absmiddle" alt=""/> **Replay Theatre:** any saved run, frame by frame
- <img src="assets/icons/file.svg" height="20" align="absmiddle" alt=""/> **PDF claim receipts and statements** from the Claims Ledger
- <img src="assets/icons/book.svg" height="20" align="absmiddle" alt=""/> **Plain-English explanations** for every blockchain word
- <img src="assets/icons/target.svg" height="20" align="absmiddle" alt=""/> **Full Showdown button:** Old vs Secured, all 5 tricks, one click

<details>
<summary><img src="assets/icons/book.svg" height="20" align="absmiddle" alt=""/> <b>Click for the blockchain words in plain English</b></summary>

<br/>

| Word | What it really means |
|---|---|
| **Blockchain** | A shared notebook everyone can read and nobody can erase |
| **Smart contract** | A self-running rulebook that pays automatically when its rules are met |
| **Transaction** | One recorded action, like filing a claim or sending a payout |
| **Block** | One page of the notebook, holding a batch of transactions |
| **Wallet** | An account number plus a secret key that proves it is you |
| **Signature** | A digital stamp that proves who approved something |
| **Test coins (ETH)** | Practice money of the practice network, shown here as rupees |

</details>

<img src="assets/divider.svg" width="100%" alt=""/>

<a id="stack"></a>

## <img src="assets/icons/cube.svg" height="30" align="absmiddle" alt=""/> Tech stack

| Layer | Technology |
|---|---|
| <img src="assets/icons/vault.svg" height="18" align="absmiddle" alt=""/> **Smart contracts** | Solidity, Hardhat (12 tests) |
| <img src="assets/icons/terminal.svg" height="18" align="absmiddle" alt=""/> **Backend** | Node.js, Express, WebSocket, SQLite |
| <img src="assets/icons/layers.svg" height="18" align="absmiddle" alt=""/> **Frontend** | React, Vite, three.js (bloom, glass, shaders) |
| <img src="assets/icons/star.svg" height="18" align="absmiddle" alt=""/> **Design** | Playfair Display + Manrope, navy and gold theme |
| <img src="assets/icons/play.svg" height="18" align="absmiddle" alt=""/> **Hosting** | GitHub + Vercel (frontend) |

<img src="assets/divider.svg" width="100%" alt=""/>

<a id="shots"></a>

## <img src="assets/icons/camera.svg" height="30" align="absmiddle" alt=""/> Screenshots

<div align="center">

| Start Here | Live Lab |
|:-:|:-:|
| <img src="docs/screenshots/home.png" alt="Start Here page" width="440"/> | <img src="docs/screenshots/lab.png" alt="Live Lab" width="440"/> |

| Replay | Claims Ledger |
|:-:|:-:|
| <img src="docs/screenshots/replay.png" alt="Replay" width="440"/> | <img src="docs/screenshots/ledger.png" alt="Claims Ledger" width="440"/> |

</div>

<img src="assets/divider.svg" width="100%" alt=""/>

<a id="run"></a>

## <img src="assets/icons/play.svg" height="30" align="absmiddle" alt=""/> Run it locally

**You need:** [Node.js](https://nodejs.org) and [Git](https://git-scm.com).

### <img src="assets/icons/bolt.svg" height="24" align="absmiddle" alt=""/> The quick way (Windows)

```powershell
git clone https://github.com/YOURNAME/apexforge.git
cd apexforge
.\start-demo.ps1
```

Then open **http://localhost:5173**

### <img src="assets/icons/terminal.svg" height="24" align="absmiddle" alt=""/> The manual way

Install packages once in each folder (`chain`, `backend`, `frontend`) with `npm install`. Then use 3 terminals:

| Terminal | Folder | Commands |
|:-:|---|---|
| 1 | `chain` | `npx hardhat node` |
| 2 | `backend` | `node deploy.js` then `node server.js` |
| 3 | `frontend` | `npm run dev` |

### <img src="assets/icons/flask.svg" height="24" align="absmiddle" alt=""/> Run the tests

```powershell
cd chain
npx hardhat test
```

You should see **12 passing**.

<details>
<summary><img src="assets/icons/check.svg" height="20" align="absmiddle" alt=""/> <b>Click for the demo checklist</b></summary>

<br/>

| Check | Expected |
|---|---|
| Old System, run all 5 tricks | 5 broken, safety 0% |
| Secured System, run all 5 tricks | 5 blocked, safety 100% |
| Replay a saved run | Slider, play and step all work |
| Reset demo | Back to ₹10,00,000, history cleared |

</details>

<img src="assets/divider.svg" width="100%" alt=""/>

## <img src="assets/icons/folder.svg" height="30" align="absmiddle" alt=""/> Project structure

```
apexforge/
├── chain/              Smart contracts, tests, Hardhat
├── backend/            deploy.js, chain.js, Express + WebSocket, SQLite
├── frontend/           React app, 3D scene, pages
│   ├── public/         logo.png
│   └── src/            Scene3D.jsx, Hero3D.jsx, pages/
├── assets/             README banner, divider and icons
├── docs/               Screenshots and notes
├── start-demo.ps1      Starts everything in one go
├── DEMO_SCRIPT.md      What to say during the demo
└── VIVA_QA.md          Questions and answers for the viva
```

<img src="assets/divider.svg" width="100%" alt=""/>

<div align="center">

### <img src="assets/icons/cap.svg" height="30" align="absmiddle" alt=""/> Built for the Sem VII Blockchain Technology mini project

**Manali** · B.Tech Computer Science and Technology
Usha Mehta Institute of Technology, SNDT University, Mumbai

<br/>

<img src="assets/icons/star.svg" height="20" align="absmiddle" alt=""/> **If you like this project, give it a star!** <img src="assets/icons/star.svg" height="20" align="absmiddle" alt=""/>

<sub>Break it. Forge it. Make it unbreakable.</sub>

</div>