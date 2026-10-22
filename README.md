# 🦠 Análise Epidemiológica da Febre Maculosa no Brasil

Este repositório contém scripts de análise exploratória, tratamento e visualização de dados epidemiológicos da **Febre Maculosa Brasileira (FMB)**. O objetivo principal do projeto é mapear a distribuição temporal/geográfica da doença e avaliar a realização de exames diagnósticos no país.

---

### 📂 Estrutura do Repositório

```text
├── FMACBR13.xlsx            # Base de dados original (Excel)
├── grafico_maculosa2013.R   # Script em R para manipulação de dados e gráficos
├── explorando.py            # Script em Python para análise de frequências
└── README.md                # Documentação do projeto
```

---

### 📌 Principais Objetivos

* **Identificação dos Focos de Incidência**: Mapear os municípios com maior número de notificações (`top5_municipios`).
* **Análise Temporal**: Acompanhar o comportamento da doença ao longo do tempo (por trimestres e anos).
* **Indicadores Diagnósticos**: Calcular a proporção de exames laboratoriais realizados (ex: Histopatologia e Imunohistoquímica).

---

### 🛠️ Tecnologias e Pacotes Utilizados

#### **Linguagem R (`tidyverse`)**
* `dplyr`: Manipulação de dados (`filter`, `group_by`, `summarise`, `mutate`).
* `ggplot2`: Construção de gráficos de séries temporais e barras.
* `lubridate`: Manipulação e parsing de datas epidemiológicas.

#### **Linguagem Python (`pandas`)**
* `pandas`: Leitura do arquivo Excel (`read_excel`) e cálculo de distribuições percentuais (`value_counts`).
* `openpyxl`: Suporte para leitura de arquivos `.xlsx`.

---

### 🚀 Como Executar o Projeto

#### **Em R**
1. Certifique-se de ter os pacotes instalados:
   ```R
   install.packages("tidyverse")
   install.packages("readxl")
   ```
2. Abra o arquivo `grafico_maculosa2013.R` no RStudio e execute as linhas sequencialmente.

#### **Em Python**
1. Instale as dependências necessárias:
   ```bash
   pip install pandas openpyxl
   ```
2. Execute o arquivo `explorando.py`:
   ```bash
   python explorando.py
   ```

---

### 📊 Exemplos de Análises Realizadas

#### **1. Filtragem dos Maiores Focos (R)**
```R
# Seleção dos 5 municípios com mais casos
top5_municipios <- dados |> 
  count(ID_MUNICIP, sort = TRUE) |> 
  slice_head(n = 5) |> 
  pull(ID_MUNICIP)

# Gráfico de tendência por trimestre
dados |> 
  filter(ID_MUNICIP %in% top5_municipios) |> 
  ggplot(aes(x = trimestre, y = n, color = factor(ID_MUNICIP), group = ID_MUNICIP)) +
  geom_line() +
  labs(title = "Evolução do Número de Casos nos Maiores Focos", x = "Trimestre", y = "Casos")
```

#### **2. Percentual de Exames Não Realizados (Python)**
```python
import pandas as pd

dados = pd.read_excel("FMACBR13.xlsx")

# Porcentagem de exames Histopatológicos por categoria
pct_histopato = (dados["HISTOPATO"].value_counts(normalize=True) * 100).round(2)
print(pct_histopato)
```

---

### 📜 Licença
Este projeto é de cunho acadêmico e de análise de dados abertos de saúde pública.
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
