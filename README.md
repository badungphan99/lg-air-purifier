<p align="center">
  <img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

<h1 align="center">Homebridge LG Air Purifier</h1>

<p align="center"><em>This project is currently in active development 🚧</em></p>

---

## ✨ Features

- Automatically discovers air purifier devices from your LG ThinQ account
- Seamlessly syncs with Apple HomeKit for smart control
- Basic control and status monitoring, including:
  - Power: On/Off
  - Wind Strength Control: `auto`, `slow`, `mid`, `high`, `turbo`
  - Sleep Mode: Enable/Disable

---

## ✅ Tested Devices

- **LG PuriCare 360** (`AIR_910604_WW`)

---

## 🚀 Installation (Beta Version)

To install the **beta version** of this plugin:

```bash
npm install homebridge-lg-air-purifier@beta
```

---

## ⚙️ Configuration

Add the following block to the `"platforms"` section of your Homebridge `config.json`:

```json
"platforms": [
  {
    "platform": "LGAirPurifier",
    "name": "homebridge-lg-air-purifier",
    "country": "VN",
    "region": "kic",
    "token": "your_thinq_pat_token",
    "interval": 30
  }
]
```

---

### 🔑 Parameters

| Key       | Description |
|-----------|-------------|
| `platform` | Must be `"LGAirPurifier"` |
| `name`     | Plugin name (can be anything, default: `"homebridge-lg-air-purifier"`) |
| `country`  | Your [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) country code (e.g. `"US"`, `"VN"`, `"KR"`) |
| `region`   | LG server region for your account:<br>• `"kic"` – Asia<br>• `"eic"` – Europe<br>• `"aic"` – North/South America |
| `token`    | Your **LG ThinQ Personal Access Token (PAT)**. <br>👉 Get it here: [https://connect-pat.lgthinq.com](https://connect-pat.lgthinq.com) |
| `interval` | *(optional)* Polling interval in seconds (default: `30`) |

> ⚠️ **Note on Rate Limits:**  
> The LG ThinQ API has request limits. Setting a low interval (e.g. less than 20 seconds) may result in throttling or request failures. A 30–60 second interval is recommended for stability.

---

## 🛠️ Support

If you encounter any issues or have questions:

- 📧 Email: [me@dungpb.com](mailto:me@dungpb.com)
- 🐛 Report an issue: [GitHub Issues](https://github.com/badungphan99/lg-air-purifier/issues)