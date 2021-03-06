import { BigraphQM } from "./BigraphQM.mjs";

/**
* @class Bigraph QM DOT
* @author Mika Suominen
*/
class BigraphQMDOT extends BigraphQM {

	/**
	* @constructor
	*/
	constructor() {
    super();

		this.cacheQ = ''; // DOT cache for quantum mode
		this.cacheC = ''; // DOT cache for classical mode
		this.cacheBase64 = 'A'; // Base64 cache, 'A' is empty -> initial graph
		this.needsupdate = true; // DOT cache needs update

		this.base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

		// Graph style
		this.styleGraph = 'ranksep=0.15 bgcolor=transparent ordering=in outputorder=edgesfirst node [fixedsize=true fontname=Helvetica fontsize="10pt" fontcolor=grey35 style=filled]';

		// Type styles
		this.styleObserver = 'node [class=observer shape=box width=0.3 height=0.3 penwidth=1 color=grey fillcolor=white label="X"]';
		this.styleEnvironment = 'node [class=environment label="E"]';
		this.styleEvent = 'node [class=event shape=circle image="" width=0.14 height=0.14 penwidth=0 fillcolor=grey label=""]';
		this.styleToken = 'node [class=token width=0.28 height=0.28 penwidth=0 color=white label="0" colorscheme=orrd6 fillcolor=1]';
		this.styleClique = 'node [class=clique shape=box width=0.4 height=0.3 penwidth=0 label="0" colorscheme=orrd6 fillcolor=1]';
		this.styleK = 'node [class=token shape=circle width=0.28 height=0.28 penwidth=0 color=white label="0" colorscheme=orrd6 fillcolor=1]';

		// Edge styles
		this.styleEdge = 'edge [class=link penwidth=1.5 color=grey arrowhead=normal arrowsize=0.5 style=solid weight=1]';
		this.styleEdgeK = 'edge [class=link penwidth=1.5 color=grey arrowhead=none style=solid weight=1]';
		this.styleOrdering = 'rank=same edge [class=order style=none arrowhead=none penwidth=12 color=transparent weight=10]';

		// Selection styles
		this.styleSelBranch = 'penwidth=2 color=black';
		this.styleSelSpace = 'penwidth=2 color=steelblue';
		this.styleSelNode = 'penwidth=2 color=black';
		this.styleSelLink = 'penwidth=2 color=black';
		this.styleSelClique = 'penwidth=2 color=black';
	}

	/**
	* Clear.
	*/
	reset() {
		super.reset();
		this.cacheQ = '';
		this.cacheC = '';
		this.cacheBase64 = 'A';
		this.needsupdate = true; // DOT cache needs update
	}

	/**
	* Execute command sequence (override).
	* @param {Command[]} cs Command sequence
	*/
	exec(cs) {
		this.needsupdate = true;
		super.exec(cs);
	}


	/**
	* Calculate Base64 encoded string
	*/
	calculateBase64() {
		// Bit string as an array of booleans
		const arr = [];

		let prev = this.TIME.get(this.inittime);
		const bits = [32,16,8,4,2,1];
		for( let t=this.inittime+1; t<=this.time; t++) {
			let next = this.TIME.get(t);

			// Represent the number of vertices on this layer
			let q = Math.floor( next.length / 63 );
			let m = next.length % 63;
			arr.push( ...Array(6*q).fill(true) );
			bits.forEach( (x,j) => arr.push( (m & x) ? true : false ) );

			// Adjacency matrix
			next.forEach( x => {
				prev.forEach( y => {
					arr.push( y.child.includes(x) );
				});
			});

			prev = next;
		}

		// Base64 encode the array of booleans
		this.cacheBase64 = '';
		for (let i=0; i<arr.length/6; i++) {
			let n = 0;
			for (let b=0; b<6; b++) n=n*2+(arr[i*6+b] ? 1 : 0);
			this.cacheBase64 += this.base64.charAt(n);
		}
		if ( this.cacheBase64.length === 0 ) this.cacheBase64 += 'A';
	}


	/**
	* Refresh cache if needed
	*/
	refresh() {
		this.calculateProbabilities();
		this.calculateBase64();

		// Graph
		this.cacheQ = this.styleGraph;

		// Types
		this.cacheQ += this.dotType(-1,this.styleObserver);
		this.cacheQ += this.dotType(-2,this.styleEnvironment);
		this.cacheQ += this.dotType(0,this.styleEvent);
		this.cacheC = this.cacheQ;
		this.cacheQ += this.dotType(1,this.styleToken);
		this.cacheQ += this.dotOrder();
		this.cacheQ += this.dotFinal();
		this.cacheQ += this.dotProbabilities();

		this.needsupdate = false;
		this.updatetime = this.time;
	}


	/**
	* DOT for token probabilities
	* @return {String}
	*/
	dotProbabilities() {
		let s = '\n\n';
		for( let i=this.inittime; i<=this.time; i+=2) {
			const sigma = this.types([1],i); // tokens
			sigma.forEach( v => {
				if ( v.p ) {
					let label = this.round(v.p,2).toString();
					if ( label > 0 && label < 1 ) label = '.' + label.split('.')[1];
					let fillcolor = this.round(v.p*5)+1;
					s += ' ' + this.title(v) + ' [label="' + label +'" fillcolor=' + fillcolor + ']';
				}
			});
		}
		return s;
	}

	/**
	* DOT for final measurement values
	* @return {String}
	*/
	dotFinal() {
		let s = '\n\n' + this.styleClique + ' ' + this.styleEdge;
		const m = this.M1.get(this.time);
		m.p.forEach( (x,i) => {
			let title = 'C' + this.time + '_' + i;
			s += ' ' + title + ' [label="' + this.round(100*x) +
				'%" fillcolor=' + (this.round(x*5)+1) + ']';
			m.f[i].forEach( y => {
				if ( y.type === 1 ) s += ' ' + this.title(y) + '->' + title;
			});
		});
		return s;
	}


	/**
	* DOT for types
	* @param {String} type Type name
	* @param {String} style DOT style
	* @return {String}
	*/
	dotType(type, style) {
		let s = '';
		let os = this.TYPE.get(type);
		if ( os && os.length > 0 ) {
			s += '\n\n' + style + ' ' + os.map(x => this.title(x)).join(' ');
		}
		return s;
	}

	/**
	* DOT edges for quantum mode
	* @param {number[]} selv Selected vertices
	* @param {number[]} selspace Selected space
	* @param {number[]} selbranch Selected branch
	* @return {String}
	*/
	dotEdgesQ(selv,selspace,selbranch) {
		let s = '\n\n' + this.styleEdge;

		// Edges
		for( const v of this.V.values() ) {
			let vtitle = this.title(v);
			v.child.forEach( (x,i) => {
				let xtitle = this.title(x);
				s += ' ' + vtitle + '->' + xtitle;
				if ( selv && selv.includes(vtitle) && selv.includes(xtitle) ) {
					s += ' [' + this.styleSelLink + ']';
				} else if ( selbranch && selbranch.includes(vtitle) && selbranch.includes(xtitle) ) {
					s += ' [' + this.styleSelLink + ']';
				}
			});
		}

		// Selections
		if ( selbranch && selbranch.length ) {
			selbranch.forEach( x => s += ' ' + x + ' [' + this.styleSelBranch + ']' );
		}
		if ( selspace && selspace.length ) {
			selspace.forEach( x => s += ' ' + x + ' [' + this.styleSelSpace + ']' );
		}
		if ( selv && selv.length ) {
			selv.forEach( x => s += ' ' + x + ' [' + this.styleSelNode + ']' );
		}

		return s;
	}

	/**
	* DOT for token ordering
	* @return {String}
	*/
	dotOrder() {
		let s = '';
		for( let i=1; i<=this.time; i+=2) {
			const vs = this.TIME.get(i);
			if ( vs.length > 1 ) {
				s += ' {' + this.styleOrdering + ' ' + vs.map( x => this.title(x) ).join(' ');
				s += ' ' + vs.map(x => this.title(x)).join('->') + '}';
			}
		}
		return s.length ? '\n\n' + s : s;
	}

	/**
	* DOT Quantum
	* @param {String[]} [titles=null] If specified, vertices to highlight
	* @param {String[]} [titlesCliques=null] If specified, vertices to highlight
	* @return {String}
	*/
	dotQ( titles=null, titlesCliques=null ) {
		if ( this.needsupdate ) this.refresh();

		let s = '';
		let selV = null;
		let selSpace = null;
		let selBranch = null;
		if ( titles ) {
			selV = titles;
			if ( titles.length === 1 ) {
				let v = this.v(titles[0]);
				// selBranch = this.branch(titles[0]).map( x => x.id );
				let vs = this.space([ v ]).map( x => [...x.parent,x,...x.child ]).flat();
				selSpace = [...new Set( vs )].filter( x => this.isSpacelike([v],[x]) ).map( x => this.title(x) );
			}
		}

		// Edges and selections
		s += this.dotEdgesQ(selV,selSpace,selBranch);

		// Selected cliques
		if ( titlesCliques && titlesCliques.length ) {
			titlesCliques.forEach( x => s += ' ' + x + ' [' + this.styleSelClique + ']' );
		}

		return 'digraph {\n\n' + this.cacheQ + s + '\n\n}';
	}

	/**
	* DOT cliques
	* @param {String[]} [titlesCliques=null] If specified, vertices to highlight
	* @return {String}
	*/
	dotC( titlesCliques=null ) {
		if ( this.needsupdate ) this.refresh();

		let s = '\n\n' + this.styleClique + ' ' + this.styleEdge;

		// Edges
		for( const v of this.V.values() ) {
			let vtitle = this.title(v);
			if ( v.type < 1 ) {
				v.child.forEach( x => {
					if ( x.type < 1 ) s += ' ' + vtitle + '->' + this.title(x);
				});
			}
		}

		// Classical states
		for( const [k,v] of this.M1.entries() ) {
			let ordering = [ k+'.0' ];
			v.p.forEach( (x,i) => {
				let title = 'C' + k + '_' + i;
				s += ' ' + title + ' [label="' + this.round(100*x) +
					'%" fillcolor=' + (this.round(x*5)+1) + ']';
				ordering.push(title);
				v.f[i].forEach( y => {
					if ( y.type == 1 ) {
						y.parent.forEach( z => s += ' ' + this.title(z) + '->' + title );
						y.child.forEach( z => s += ' ' + title + '->' + this.title(z) );
					}
				});
			});
			ordering.push( k+'.'+(this.TIME.get(k).length-1) );
			s += ' {' + this.styleOrdering + ' ' + ordering.join(' ');
			s += ' ' + ordering.join('->') + '}';
		}

		// Selected cliques
		if ( titlesCliques && titlesCliques.length ) {
			titlesCliques.forEach( x => s += ' ' + x + ' [' + this.styleSelClique + ']' );
		}

		return 'digraph {\n\n' + this.cacheC + s + '\n\n}';
	}

	/**
	* DOT K-graphs
	* @param {String[]} [titlesCliques=null] If specified, vertices to highlight
	* @return {String}
	*/
	dotK( titlesCliques=null ) {
		if ( this.needsupdate ) this.refresh();

		const m = this.M1.get(this.time);

		// Selected tokens
		const selTokens = [];
		if ( titlesCliques && titlesCliques.length ) {
			titlesCliques.forEach( x => {
				let i = x.split('_')[1];
				m.f[i].forEach( v => selTokens.push(v) );
			});
		}

		// Tokens
		let s = this.styleGraph + '\n\nsubgraph cluster_A { bgcolor=white color=white fontcolor=grey35 label="G\'"\n\n' + this.styleK;
		const t = [...new Set( m.f.flat() )];
		s += ' ' + t.map( v => this.title(v) ).join(' ') + '\n\n';

		t.forEach( v => {
			let label = this.round(v.p,2).toString();
			if ( label > 0 && label < 1 ) label = '.' + label.split('.')[1];
			let fillcolor = this.round(v.p*5)+1;
			s += ' ' + this.title(v) + ' [label="' + label +'" fillcolor=' + fillcolor;
			if ( selTokens.includes(v) ) {
				s += ' ' + this.styleSelNode;
			}
			s += ']';
		});

		s += '\n\n' + this.styleEdgeK;

		const es = [];
		const essel = [];
		m.f.forEach( x => {
			for(let i=0; i<x.length-1; i++) {
				for(let j=i+1; j<x.length; j++) {
					let e = this.title(x[i]) + '--' + this.title(x[j]);
					if ( !es.includes(e) ) {
						es.push(e);
						essel.push( selTokens.includes(x[i]) && selTokens.includes(x[j]) );
					}
				}
			}
		});
		es.forEach( (e,i) => {
			s += ' ' + e + (essel[i] ? ' [' + this.styleSelLink + ']' : '');
		});

		// Cliques
		s += '\n\n}\n\nsubgraph cluster_B { bgcolor=white color=white fontcolor=grey35 label="K(G\')"\n\n' + this.styleClique;
		s += ' ' + m.p.map( (x,i) => 'C' + this.time + '_' + i ).join(' ') + '\n\n';

		m.p.forEach( (x,i) => {
			let title = 'C' + this.time + '_' + i;
			s += ' ' + title + ' [label="' + this.round(100*x) +
				'%" fillcolor=' + (this.round(x*5)+1) + ']';
		});

		s += '\n\n' + this.styleEdgeK;
		for(let i=0; i<m.f.length-1; i++) {
			let title1 = 'C' + this.time + '_' + i;
			for(let j=i+1; j<m.f.length; j++) {
				if ( m.f[j].some( x => m.f[i].includes(x) ) ) {
					let title2 = 'C' + this.time + '_' + j;
					s += ' ' + title1 + '--' + title2;
				}
			}
		}

		s += '\n\n}';

		// Selected cliques
		if ( titlesCliques && titlesCliques.length ) {
			s += '\n\n';
			titlesCliques.forEach( x => {
				s += ' ' + x + ' [' + this.styleSelClique + ']';
			});
		}

		return 'graph {\n\n' + s + '\n\n}';
	}


	/**
	* Make a random measurement
	*/
	measure() {
		const obs = this.types([-1]); // observers
		if ( obs && obs.length ) {
			const s = this.space(obs,[1]);
			if ( s && s.length ) {
				const p = s.map( x => x.parent[0] ).filter( y => !this.isEdge(y,obs[0]) );
				if ( p.length ) {
					this.addEdge( p[Math.floor(Math.random()*p.length)], obs[0] );
				}
			}
		}
	}

	/**
	* Make a random interaction between the system and the environment
	* (decoherence).
	*/
	decohere() {
		const env = this.types([-2],this.time-2); // environment
		if ( env && env.length ) {
			const s = [ ...new Set( this.space(env,[1]).map( x => x.child ).flat() )];
			if ( s && s.length ) {
				const p = s.filter( y => y.parent.every(z => z.type > 0 ) && !this.isEdge(env[0],y) );
				if ( p.length ) {
					this.addEdge( env[0], p[Math.floor(Math.random()*p.length)] );
				}
			}
		}
	}


	/**
	* Import graph.
	* @param {String} s Base64 encoded bigraph
	*/
	import(s) {
		// Decode Base64 string into an array of booleans
    const arr = [];
    for (let i=0; i<s.length; i++) {
      let n = this.base64.indexOf(s.charAt(i));
			if ( n === -1 ) throw new TypeError('URL parameter "g" not a valid base64 string.');
      for (let b=6-1; b>=0; b--) {
          arr[i*6+b] = !!(n % 2);
          n = Math.floor(n/2);
      }
  	}

		this.reset();
		let prev = this.TIME.get(this.inittime);
		let t = this.inittime + 1; // Current level
		const bits = [32,16,8,4,2,1];
		let i = 0; // Array position
		while( arr.length - i >= 6 ) {
			// Encode the number of vertices on this layer
			let n = 0, m = 0;
			do {
				m = bits.reduce((a,b) => a + (arr[i++] ? b : 0), 0 );
				n += m;
			} while( m == 63 && arr.length - i >= 6 );
			if ( n === 0 ) break;

			// Construct the layer
			const cs = []; // Command sequence
			for( let j=0; j<n; j++) {
				let type = 1;
				if ( t % 2 === 0 ) {
					type = 0;
				} else {
					if ( j == 0 ) {
						type = -1;
					} else if ( j == (n-1) ) {
						type = -2;
					}
				}
				cs.push( { op: 1, id: ++this.id, type: type, time: t });
				for( let k=0; k<prev.length; k++) {
					if ( i >= arr.length ) throw new TypeError('Invalid URL parameter "g".');
					if (arr[i]) cs.push( { op: 2, tail: prev[k].id, head: this.id, time: t });
					i++;
				}
			}

			this.exec(cs);
			prev = this.TIME.get(t);
			t++;
		}
	}

	/**
	* Export graph.
	* @return {String} Base64 encoded bigraph
	*/
	export() {
		if ( this.needsupdate ) this.refresh();
		return this.cacheBase64;
	}

	/**
	* Get status.
	* @param {String[]} [titles=null] Selected vertices
	* @param {String[]} [titlesCliques=null] Selected cliques
	* @return {Object[]} Status object
	*/
	status(titles=null,titlesCliques=null) {
		if ( this.needsupdate ) this.refresh();
		let s = [];
		let ss = '';

		// Selection status for nodes
		if (titles && titles.length > 0) {
			ss += 'Selected:\n<table><tr><td>\\(\\quad A =\\)</td><td>{' + titles.join(',&#8203;') + '}</td></tr></table>';
			if ( titles.length === 1 ) {
				let v = this.v(titles[0]);
				if ( v.type !== 0 ) {
					let obs = this.types([-1],v.time)[0];
					ss += 'Space:\n<table><tr><td>\\(\\quad S(A)=\\)</td>';
					ss += '<td>{' + this.space([v]).map(x => this.pos(x)).join(',&#8203;') + '}</td></tr></table>';
					ss += 'Graph distance to observer:\n<table><tr><td>\\(\\quad d_G(X,A)=' + this.distance(obs,v) + '\\)</td></tr></table>';
				}
			} else if (titles.length === 2 ) {
				let v1  = this.v(titles[0]);
				let v2  = this.v(titles[1]);
				let d = this.hammingDistance(v1,v2);
				let cs = this.cosineSimilarity(v1,v2);
				if ( d && cs ) {
					ss += 'Graph distance:\n<table><tr><td>\\(\\quad d_G =' + this.distance(v1,v2) + '\\)</td></tr></table>';
					ss += 'Hamming distance:\n<table><tr><td>\\(\\quad d_H = ' + d.d +
						',\\quad |\\Omega| = ' + d.len +
						',\\quad 1-{d_H \\over |\\Omega|} = ' + this.round(1-d.d/d.len,2) + '\\)</td></tr></table>';
					ss += 'Cosine similarity:\n<table><tr><td>\\(\\quad S_C = ' + this.round(cs.cs,2) +
						',\\quad S_C^2 = ' + this.round(cs.cs2,2) + '\\)</td></tr></table>';
				}
			}
		}

		// Selection status for cliques
		if (titlesCliques && titlesCliques.length > 0) {
			if ( ss.length ) ss += '<br/>';
			if ( titlesCliques.length === 1 ) {
				const [t,p] = titlesCliques[0].substring(1).split('_').map(Number);
				ss += 'Selected:\n<table><tr><td>\\(\\quad A = C_{' + p + '}^{' + t + '}\\)</td></tr></table>';
				let f = this.M1.get(t).f[p];
				ss += 'Microstate:\n<table><tr><td>\\(\\quad \\mathcal{F}_A =\\)</td>';
				ss += '<td>{' + f.map(x => this.pos(x)).join(',&#8203;') + '}</td></tr></table>';
			} else if (titlesCliques.length === 2 ) {
				const [t1,p1] = titlesCliques[0].substring(1).split('_').map(Number);
				const [t2,p2] = titlesCliques[1].substring(1).split('_').map(Number);
				ss += 'Selected:\n<table><tr><td>\\(\\quad A = C_{' + p1 + '}^{' + t1 + '},\\quad B = C_{' + p2 + '}^{' + t2 + '}\\)</td></tr></table>';
				if ( t1 === t2 ) {
					let m = this.M1.get(t1);
					let d = 2 * m.f[p1].filter( x => m.f[p2].includes(x) ).length / ( m.f[p1].length + m.f[p2].length );
					let theta = this.degreeToString( this.M2.get(t1).theta[p1][p2] );
					ss += 'Relative phase:\n<table><tr><td>\\(\\quad \\theta_{A,B}=' + theta + ',\\quad D_{A,B}=' + this.round(d,2) + '\\)</td></tr></table>';
				}
			} else {
				ss += 'Selected:\n<table><tr><td>\\(\\quad C =\\)</td><td>{' + titlesCliques.join(',&#8203;') + '}</td></tr></table>';
			}
		}

		// Nothing selected
		if ( ss.length === 0 ) ss += 'None.';

		s.push( { id: 'd0', text: ss });
		s.push( ...super.status(titles) );

		return s;
	}


}

export { BigraphQMDOT };
