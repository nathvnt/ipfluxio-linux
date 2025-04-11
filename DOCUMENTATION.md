# ipflux.io Network Traffic Analyzer 

## Linux Installation Instructions 🐧🐧🐧

Download and install using one of the pre-packaged distribution formats below.
 
---

### For Debian-Based Systems (`.deb`)

#### Step 1 – Download the `.deb` package

```bash
curl -LO https://github.com/nathvnt/ipfluxio-linux/raw/master/release/ipfluxio_1.0.0_amd64.deb
```

#### Step 2 – Install the package

```bash
sudo dpkg -i ipfluxio_1.0.0_amd64.deb
```

---

### For Arch-Based or Other Linux Systems (`.tar.gz`)

#### Step 1 – Download the `.tar.gz` archive

```bash
curl -LO https://github.com/nathvnt/ipfluxio-linux/raw/master/release/ipfluxio-1.0.0.tar.gz
```

#### Step 2 – Extract archive contents

```bash
tar -xvzf ipfluxio-1.0.0.tar.gz
```

#### Step 3 – Navigate to the extracted directory

```bash
cd ipfluxio-1.0.0/
```

#### Step 3 – Run installation script

```bash
./ipflux.io 
```

> *Running this script will prompt for sudo privileges in order to run the post install script for setting up the environment* [  (https://github.com/nathvnt/ipfluxio-linux/blob/master/prod/postinstall.sh)  ](https://github.com/nathvnt/ipfluxio-linux/blob/master/prod/postinstall.sh)

#### If needed, make the script executable:

```bash
chmod +x ./ipflux.io
```

---
### Manual Build Instructions

If you would like to build the project manually using the source code, follow these steps:

---

#### Step 1 – Clone the GitHub repository to obtain the projects source code

```bash
git clone https://github.com/nathvnt/ipfluxio-linux.git
```

#### Step 2 – Navigate to the production folder

```bash
cd ipfluxio-linux/prod/
```

#### Step 3 – Build and bundle the source code to generate packaged distributions

```bash
npm install 
```

```bash
npm run dist
```

#### Step 4 – Navigate to the build output directory

```bash
cd ipflux-build/
```
*Follow the instructions above for installing the `.deb` or `.tar.gz` packages added to the `ipflux-build` directory*

---
## System Requirements

The packaged `.deb` and `.tar.gz` distributions of `ipflux.io` are self-contained, but your system must meet the following requirements for a successful install:

---

### Runtime Requirements (for all users)

- **Linux** system (tested on Debian-based and Arch-based distros)
- **Python 3.7+** must be installed and discoverable in `PATH`
- **`sudo` access** is required during installation to:
  - Set up system-wide services (via `systemd`)
  - Install packet capture permission policies (`polkit`)
  - Create necessary directories in `/opt` and `/var/log`

> *Python is used to create a dedicated virtual environment under `/opt/ipfluxio/venv`, and all backend dependencies are installed there automatically. This isolated Python environment is given setcap privileges to enable capturing network traffic; these escalated privileges will not impact your system’s default Python interpreter*

---
### (Recommended)

- `systemd` (for scheduling scans via `ipfluxio-scheduler.path`)
- `git` (if building from source)
- `curl` or `wget` (to download install packages)

---

### Manual Build Requirements

If you're building from source, you'll need:

- Node.js (v18+ recommended)
- npm (comes with Node.js)
- Git
- Linux (Debian, Arch, or any system with Bash and basic POSIX tools)

Install Node.js via [NodeSource](https://github.com/nodesource/distributions) or [nvm](https://github.com/nvm-sh/nvm).

---



