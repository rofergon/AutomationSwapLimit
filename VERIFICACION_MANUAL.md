# Verificación Manual de Contratos en HashScan

## Contratos Desplegados
- **TestToken**: `0x7142A4b3f71834775C760366173f1B69f8eaFe88`
- **AutoSwapLimit**: `0xaaa51B3C7b17F10A7fF720E085509079794B1334`

## Pasos para Verificación Manual

### 1. Ir a HashScan
- Abre https://hashscan.io/testnet
- Busca la dirección de tu contrato (ejemplo: `0xaaa51B3C7b17F10A7fF720E085509079794B1334`)

### 2. Iniciar Verificación
- En la página del contrato, busca la sección "Contract Bytecode"
- Haz clic en el botón "Verify"
- Se abrirá una ventana para subir archivos

### 3. Subir Archivos de Verificación
Para contratos compilados con **Hardhat**, necesitas:
- **Solo el archivo JSON de build-info** (ubicado en `artifacts/build-info/`)

Archivos disponibles en tu proyecto:
- `artifacts/build-info/ff7b5ebbf4726be35534ca1cf6a97797.json`
- `artifacts/build-info/bfdcd5f48dcc5198c30f86ab20576dce.json`
- `artifacts/build-info/b7d92ed19eaba68f2738cbf6c6603192.json`

**Usa el archivo más reciente** (generalmente el más grande o más reciente por fecha).

### 4. Completar Verificación
- Sube el archivo JSON de build-info
- HashScan procesará el archivo usando Sourcify
- Si es exitoso, obtendrás un "Full Match" o "Partial Match"
- El bytecode será visible inmediatamente

## Resultado Esperado
Una vez verificado, podrás ver:
- El código fuente completo del contrato
- El bytecode desplegado
- Todas las funciones y variables del contrato
- La interfaz ABI