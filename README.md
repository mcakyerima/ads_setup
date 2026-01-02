# 🚀 Ads Manager Installation Guide

Follow these simple steps to install and configure the Ads Manager system.

---

## 📁 Step 1: Upload Files to cPanel

1. **Login** to your **cPanel** account.
2. Navigate to **File Manager**.
3. Go to the **`public_html`** directory.
4. Create a new folder: **`ads-manager`**.
5. Upload **ALL files and folders** from the provided ZIP archive into this folder and extract.

---

## 🗄️ Step 2: Prepare Database Credentials

You will need the following information from **kimedata** (or your hosting provider):

- **Database Name**  
- **Database Username**  
- **Database Password**  
- **Database Host** (usually `localhost`)

> 💡 Keep these credentials handy for the next step.

---

## ⚙️ Step 3: Run Automatic Setup

1. Open your browser and visit:  
   **`https://kimedata.ng/ads-manager/`**  
   (You Replace `yourdomain.com` with your actual domain if you choose to use it as well.)

2. You will see the **Setup Page** automatically appear.

3. Fill in the required details:

   | Field | Example Value | Notes |
   |-------|---------------|-------|
   | **Database Host** | `localhost` | Usually stays as `localhost` |
   | **Database Name** | `yourusername_kimeads` | From Step 2 |
   | **Database Username** | `yourusername_adsuser` | From Step 2 |
   | **Database Password** | `********` | The password you saved |
   | **WhatsApp Number** | `+2347012799299` | For receiving ad notifications it should be exact pls|
   | **Admin Username** | `Admin` | Can be changed later in settings |
   | **Admin Password** | `Password` | Can be changed later in settings |

4. Click **“Connect Database”**.

✅ The setup is complete! User can now log in with the Admin credentials and customize their settings.

---

### 🔧 Post-Installation
- Change the default **Admin Username** and **Password** from the **Settings Page**.
- Update the **WhatsApp Number** if needed for ad notifications.

---

