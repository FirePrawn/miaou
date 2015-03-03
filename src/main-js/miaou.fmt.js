miaou(function(fmt){
	
	var coldefregex = /^\s*[:\-]*([\|\+][:\-]+)+(\||\+)?\s*$/; // used for table recognition
	
	// does simple formatting of a string which may not be a complete line.
	// Doesn't handle complex structures like lists, tables, images, code blocks, etc.
	fmt.mdStringToHtml = function(s, username) {
		return s.split('`').map(function(t,i){
			if (i%2) return '<code>'+t+'</code>';
			return t
			.replace(/\[([^\]]+)\]\((https?:\/\/[^\)\s"<>]+)\)/ig, '<a target=_blank href="$2">$1</a>') // exemple : [dystroy](http://dystroy.org)
			.replace(/\[([^\]]+)\]\((\d+)?(\?\w*)?#(\d+)\)/g, function(s,t,r,_,m){ // exemple : [lien interne miaou](7#123456)
				r = r||(miaou&&miaou.locals&&miaou.locals.room.id);
				if (!r) return s;
				return '<a target=_blank href='+r+'#'+m+'>'+t+'</a>';
			})
			// fixme : the following replacement should not happen inside a link ( exemple :  [http://some.url](http://some.url) )
			.replace(/(^|[^"])((https?|ftp):\/\/[^\s"\[\]]*[^\s"\)\[\]\.,;])/ig, '$1<a target=_blank href="$2">$2</a>') // exemple : http://dystroy.org
			.replace(/(^|>)([^<]*)(<|$)/g, function(_,a,b,c){ // do replacements only on what isn't in a tag
				return a
				+ b.replace(/(^|\W)\*\*(.+?)\*\*(?=[^\w\/]|$)/g, "$1<b>$2</b>")
				.replace(/(^|[^\w\/])\*([^\*]+)\*(?=[^\w\/\*]|$)/g, "$1<i>$2</i>")
				.replace(/(^|[^\w\/])__(.+?)__(?=[^\w\/]|$)/g, "$1<b>$2</b>")
				.replace(/(^|[^\w\/])_([^_]+)_(?=[^\w\/]|$)/g, "$1<i>$2</i>")
				.replace(/(^|[^\w\/])---(.+?)---(?=[^\w\/]|$)/g, "$1<strike>$2</strike>")
				+ c;
			})
			// the following 3 replacements are only here for very specific cases, I'm not sure they're worth the cost
			.replace(/---[^<>]*?(<(\w{1,6})\b[^<>\-]*>[^<>\-]*<\/\2>[^<>\-]*)*---/g, function(s){ return s.length>6 ? '<strike>'+s.slice(3,-3)+'</strike>' : s })
			.replace(/\*\*[^<>]*?(<(\w{1,6})\b[^<>\-]*>[^<>\-]*<\/\2>[^<>\-]*)*\*\*/g, function(s){ return s.length>4 ? '<b>'+s.slice(2,-2)+'</b>' : s })
			.replace(/\*[^<>\*]*?(<(\w{1,6})\b[^<>\-]*>[^<>\-]*<\/\2>[^<>\-]*)*\*(?=[^\*]|$)/g, function(s){ return s.length>2 ? '<i>'+s.slice(1,-1)+'</i>' : s })
		}).join('')
		.replace(/^\/me(.*)$/g, '<span class=slashme>'+(username||'/me')+'$1</span>')
	}

	// converts from the message exchange format (mainly a restricted set of Markdown) to HTML
	fmt.mdToHtml = function(md, withGuiFunctions, username){
		var table,
			ul, ol, code, // arrays : their elements make multi lines structures
			lin = md
			.replace(/^(--(?!-)|\+\+(?=\s*\S+))/,'') // should only happen when previewing messages
			.replace(/(\n\s*\n)+/g,'\n\n').replace(/^(\s*\n)+/g,'').replace(/(\s*\n\s*)+$/g,'').split('\n'),
			lout = []; // lines out
		for (var l=0; l<lin.length; l++) {
			var m, s = lin[l].replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
				.replace(/^@\w[\w\-]{2,}#(\d+)/, withGuiFunctions ? '<span class=reply to=$1>&#xe81a;</span>' : '');
			
			var codeline = /^(    |\t)/.test(s) && !(table && /\|/.test(s));
			if (code) {
				if (codeline) {
					code.push(s);
					continue;
				} else {
					lout.push('<pre><code>'+code.join('\n')+'</code></pre>');
					code = null;
				}
			} else if (codeline) {
				code = [s];
				continue;
			}
			
			if (m=s.match(/^\s*(https?:\/\/)?(\w\.imgur\.com\/)(\w{3,10})\.(gif|png|jpg)\s*$/)) {
				var bu = (m[1]||"https://")+m[2]+m[3];
				if (bu[bu.length-1]!=='m') {
					// use thumbnail for imgur images whenever possible
					lout.push('<img href='+bu+'.'+m[4]+' src='+bu+'m.'+m[4]+'>');
				} else {
					lout.push('<img src='+bu+'.'+m[4]+'>');
				}
				continue;
			}
			if (m=s.match(/^\s*(https?:\/\/[^\s<>"]+\/[^\s<>"]+)\.(bmp|png|webp|gif|jpg|jpeg|svg)\s*$/)) {
				 // exemple : http://mustachify.me/?src=http://www.librarising.com/astrology/celebs/images2/QR/queenelizabethii.jpg
				lout.push('<img src="'+m[1]+'.'+m[2]+'">');
				continue;
			}
			if (m=s.match(/^\s*(https?:\/\/[^\s<>?"]+\/[^\s<>"]+)\.(bmp|png|webp|gif|jpg|jpeg|svg)(\?[^\s<>?"]*)?\s*$/)) {
				// exemple : http://md1.libe.com/photo/566431-unnamed.jpg?height=600&modified_at=1384796271&ratio_x=03&ratio_y=02&width=900
				lout.push('<img src="'+m[1]+'.'+m[2]+(m[3]||'')+'">');
				continue;
			}
			
			if (table) {
				if (table.read(s)) continue;
				lout.push(table.html(username));
				table = null;
			} else if (/\|/.test(s) || /^\+\-[\-\+]*\+$/.test(s)) {
				if (coldefregex.test(s)) {
					table = new fmt.Table(s);
					table.push('');
					continue;
				} else if (l<lin.length-1 && coldefregex.test(lin[l+1])) {
					table = new fmt.Table(lin[++l]);
					table.push(s);
					continue;
				}
			}
			
			if (/^--\s*$/.test(lin[l])) {
				lout.push('<hr>');
				continue;
			}
			s = fmt.mdStringToHtml(s, username);
			if (m=s.match(/^(?:&gt;\s*)(.*)$/)) {
				lout.push('<span class=citation>'+m[1]+'</span>');
				continue;
			}
			
			m=s.match(/^(?:\d+\.\s+)(.*)$/);
			if (ol) {
				if (m) {
					ol.push(m[1]);
					continue;
				} else {
					lout.push('<ol>'+ol.map(function(i){ return '<li>'+i+'</li>' }).join('')+'</ol>');
					ol = null;
				}
			} else if (m) {
				ol = [m[1]]
				continue;
			}
						
			m=s.match(/^(?:\*\s+)(.*)$/);
			if (ul) {
				if (m) {
					ul.push(m[1]);
					continue;
				} else {
					lout.push('<ul>'+ul.map(function(i){ return '<li>'+i+'</li>' }).join('')+'</ul>');
					ul = null;
				}
			} else if (m) {
				ul = [m[1]]
				continue;
			}

			if (m=s.match(/^(?:(#+)\s+)(.*)$/))	{
				lout.push('<span class=h'+m[1].length+'>'+m[2]+'</span>');
				continue;
			}
			lout.push(s);
		}
		if (table) lout.push(table.html(username));
		if (code) lout.push('<pre><code>'+code.join('\n')+'</code></pre>');
		if (ol) lout.push('<ol>'+ol.map(function(i){ return '<li>'+i+'</li>' }).join('')+'</ol>');
		if (ul) lout.push('<ul>'+ul.map(function(i){ return '<li>'+i+'</li>' }).join('')+'</ul>');
		return lout.join('<br>');
	}

});