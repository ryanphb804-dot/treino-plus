# Treino+ULTRA 🏋️

App de check-in de treinos com acompanhamento de medidas corporais.

---

## Como gerar o APK via GitHub Actions

### 1. Suba os arquivos no seu repositório

Coloque **todos os arquivos** desta pasta no seu repo do GitHub (na branch `main` ou `master`).

> ⚠️ A pasta `android/` é gerada automaticamente pelo workflow — não precisa subir ela.

### 2. Ative o GitHub Actions

- Vá em **Actions** no seu repositório
- Se aparecer um aviso pedindo para ativar, clique em **"I understand my workflows, go ahead and enable them"**

### 3. Dispare o build

O build roda automaticamente quando você faz push na branch `main`.

Ou dispare manualmente:
- Vá em **Actions → Build APK – Treino+**
- Clique em **"Run workflow"**

### 4. Baixe o APK

Após o build terminar (~5 minutos):
- Clique no workflow que rodou
- Role até **Artifacts**
- Baixe **Treino-Plus-APK**
- Descompacte o `.zip` — dentro estará o `app-debug.apk`

### 5. Instale no celular

- Transfira o APK pro Android
- Nas configurações do celular, ative **"Instalar apps de fontes desconhecidas"**
- Abra o arquivo e instale!

---

## Estrutura do projeto

```
/
├── .github/workflows/build-apk.yml   ← GitHub Action
├── public/icon.png                    ← Ícone do app (2024x2024)
├── src/
│   ├── App.jsx                        ← Código principal
│   └── main.jsx                       ← Entry point React
├── capacitor.config.json              ← Config do Capacitor
├── index.html
├── package.json
└── vite.config.js
```

---

## Rodando localmente (opcional)

```bash
npm install
npm run dev
```
