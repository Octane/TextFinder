﻿TextFinder
==========

TextFinder выполняет поиск фрагмента текста в DOM-дереве, без учета количества пробелов между словами. Работает в IE9+ и других браузерах ([демо](http://octane.github.io/textfinder/)).

```javascript
var finder = new TextFinder(rootContainer);
```

##find
`TextFinder.prototype.find` выполняет поиск текста и возвращает массив с информацией о найденных фрагментах
```javascript
var matches = finder.find("search string"[, caseSensitive]);
```
массив matches содержит информацию, необходимую для того, чтобы выделить фрагмент текста с помощью Range и Selection
```javascript
matches = [
    {
		startContainer: Node,
		endContainer: Node,
		startOffset: Number,
		endOffset: Number
	},
	{
		startContainer: Node,
		endContainer: Node,
		startOffset: Number,
		endOffset: Number
	},
	…
]
```

##highlight
`TextFinder.highlight` выделяет указанный фрагмент текста, используя информацию из массива matches
```javascript
TextFinder.highlight(matches[0]);
```
