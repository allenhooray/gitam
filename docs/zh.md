<h1 align="center">
  一条命令<span style="color: #f97316;">切换 Git 用户</span>
</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/gitam"><img alt="版本" src="https://img.shields.io/badge/version-v1.2.1--beta.0-orange"></a>
  <a href="../README.md">English</a>
</p>

# GAM - Git 账号管理器

GAM 帮你把常用 Git 身份放在手边。你可以保存多个账号，查看当前正在使用哪个账号，并用一条短命令切换当前仓库或全局 Git 用户。

## 为什么用 GAM

- 不用反复手写 `git config user.name` 和 `git config user.email`。
- 用好记的 flag 保存工作、个人、客户或开源账号。
- 列表里直接看到账号正在被当前仓库、全局 Git 配置或两者同时使用。
- 切换全局 Git 用户前会确认，避免把本来只想改当前仓库的操作变成全局修改。
- 支持命令式和交互式添加、编辑、删除、切换账号。
- 支持生成 zsh 或 bash 补全，让切换更快。

## 安装

```shell
npm i -g gitam
```

## 快速开始

添加账号：

```shell
gam add github bob bob@email.com
```

将当前仓库切换到该账号：

```shell
gam use github
```

确认后切换全局 Git 用户：

```shell
gam use -g github
```

查看全部命令：

```shell
gam -h
```

文档里的 `gam` 都可以替换为 `gitam`。推荐优先使用更短的 `gam`，如果你的设备上 `gam` 已被其他程序占用，可以改用 `gitam`。

## 命令

### 添加账号

可以一次性传入全部信息：

```shell
gam add github bob bob@email.com
```

也可以只输入 `gam add`，再按提示依次输入 username、email、flag：

```shell
gam add
```

当 flag 已存在时，GAM 会询问是否覆盖。非交互环境中不会自动覆盖，请使用新的 flag 或 `gam edit`。

### 编辑账号

```shell
gam edit github --username bob
gam edit github --email bob@new-email.com
gam edit github --flag github-work
```

至少需要提供一个选项。输入会自动去掉前后空格，并校验 flag、username 和 email。

### 切换账号

修改当前仓库配置：

```shell
gam use github
```

修改全局配置：

```shell
gam use -g github
```

`gam use <flag>` 写入当前仓库配置。`gam use -g <flag>` 写入全局 Git 配置，执行前会显示当前全局账号和目标账号，并要求确认。

只输入 `gam use` 时，可以从已保存账号中交互式选择。

### 查看列表

```shell
gam list
```

列表会显示 `status` 列，用 `local`、`global` 或 `local,global` 标记当前正在使用的账号。

### 删除账号

通过 flag 删除：

```shell
gam remove github
```

通过列表 index 删除：

```shell
gam remove 1
```

只输入 `gam remove` 时，会先显示账号列表，再按提示输入 index 或 flag：

```shell
gam remove
```

### Shell 补全

生成 zsh 补全：

```shell
gam completion zsh > ~/.gam-completion.zsh
echo 'source ~/.gam-completion.zsh' >> ~/.zshrc
```

生成 bash 补全：

```shell
gam completion bash > ~/.gam-completion.bash
echo 'source ~/.gam-completion.bash' >> ~/.bashrc
```

补全脚本会补全命令名，并为 `use`、`edit`、`remove` 补全已保存的账号 flag。

## 示例

```shell
gam add github bob bob@email.com
gam add
gam edit github --email bob@new-email.com
gam add gitlab tom tom@email.com
gam use
gam use -g
gam completion zsh > ~/.gam-completion.zsh
echo 'source ~/.gam-completion.zsh' >> ~/.zshrc
```
