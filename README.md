# UX/CX Research — Карта компетенций

Интерактивный инструмент самооценки компетенций UX/CX исследователей.

## Запуск

```bash
# Установка зависимостей
npm install

# Запуск в dev-режиме
npm run dev

# Сборка для продакшн
npm run build && npm start
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000).

## Структура проекта

```
uxcx-assessment/
├── app/                    # Страницы (App Router)
│   ├── page.tsx            # Welcome — стартовый экран
│   ├── assessment/page.tsx # Прохождение оценки
│   └── results/page.tsx    # Результаты и план развития
├── components/             # UI-компоненты
├── lib/
│   ├── data-loader.ts      # Загрузка модели и CSV
│   ├── scoring.ts          # Движок подсчёта уровней
│   └── interpretation.ts   # Интерпретация результатов
├── store/
│   └── useAssessmentStore.ts # Zustand (состояние + localStorage)
├── types/
│   └── index.ts            # TypeScript-типы
└── public/data/
    ├── competency_model.json # Модель компетенций
    └── assessment_items.csv  # Банк вопросов
```

## Как редактировать банк вопросов

Файл: `public/data/assessment_items.csv`

Формат CSV:
```
item_id,competency_id,level_target,statement
PS_01,hard_problem_setting,2,Я уточняю исследовательский запрос перед началом работы
```

- **item_id** — уникальный идентификатор вопроса
- **competency_id** — ID компетенции из `competency_model.json`
- **level_target** — целевой уровень (2–5)
- **statement** — текст утверждения для оценки

При добавлении новой компетенции: сначала добавьте её в `competency_model.json`, затем создайте вопросы в CSV.

## Как работает скоринг

Подробные правила: см. `scoring_rules.md`

### Уровень компетенции
Для каждого `level_target` проверяются два условия:
1. Средний балл ответов ≥ 4
2. Минимум 60% ответов ≥ 4

Компетенция получает **максимальный уровень**, удовлетворяющий обоим условиям. Если ни один уровень не достигнут — уровень 1.

### Уровень оси
Среднее арифметическое уровней компетенций внутри оси (Craft / Impact / Leadership), округлённое вниз.

### Общий уровень
Наибольшее N, при котором:
- минимум 2 из 3 осей ≥ N
- ни одна ось < N − 1
