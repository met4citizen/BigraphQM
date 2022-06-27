import { Bigraph } from "./Bigraph.mjs";

/**
* @class Bigraph QM
* @author Mika Suominen
*/
class BigraphQM extends Bigraph {

	/**
	* @typedef {Object} Measurement
	* @property {number[]} omega Sample space
	* @property {number[][]} f Set of outcomes
	* @property {number[]} p Classical probability for each outcome
	*/

	/**
	* @constructor
	*/
	constructor() {
    super();
		this.updatetime = this.inittime; // Calculate beyond this timestamp
		this.M1 = new Map(); // Map time to measurement results of method I
		this.M2 = new Map(); // TODO: Map time to measurement results of method II
		this.factorialCache = [BigInt(0), BigInt(1)]; // Factorial memoization
	}

	/**
	* Clear.
	*/
	reset() {
		super.reset();
		this.updatetime = this.inittime; // Calculate from this time
		this.M1.clear();
		this.M2.clear();
	}


	/**
	* Round up. Use exponential notation to avoid rounding errors.
	* @param {number} x Number
	* @param {number} [e=0] Number of digits
	* @param {boolean} [allowExp=false] Allow scientific notation
	* @return {number} Number
	*/
	round(x,e=0,allowExp=false) {
		if ( allowExp && ( x > 10000 || ( x !== 0 && x < Number('1e-'+e)) ) ) return x.toExponential(e);
		return Number(Math.round(x+'e'+e) + 'e-' + e);
	};

	/**
	* Factorial with BigInt and memoization.
	* @param {bigint} n
	* @return {bigint} n!
	*/
	factorial(n) {
		while( this.factorialCache.length <= n ) {
			this.factorialCache.push(
				this.factorialCache[ this.factorialCache.length-1 ] * BigInt( this.factorialCache.length )
			);
		}
		return BigInt( this.factorialCache[n] );
	}

	/**
	* Represent degree as
	* @param {number} d Degrees
	* @return {String} String
	*/
	degreeToString(d) {
		let s;
		switch(d) {
			case 0: s = '0'; break;
			default: s = d + '°'; break;
		}
		return s;
	}

	/**
	* Parity of a permutation.
	* @param {Object[]} p Permutation of (0,1,...,n)
	* @return {number} Parity 1=even/-1=odd
	*/
	permutationParity(p) {
		let sgn = 1;
		const n = p.length;
		const visited = Array(n).fill(false);
		for(let k=0; k<n; k++) {
			if (!visited[k]) { // k not visited, start a new cycle
				let next = k;
				let len = 0;
				while( !visited[next] ) { // traverse the current cycle
					len++;
					visited[next] = true;
					next = p[next];
				}
				if ( len % 2 === 0 ) { // if length of the cycle is even, change the sign
					sgn = -sgn;
				}
			}
		}
		return sgn;
	}


	/**
	* Execute operation (override method).
	* @param {Command[]} cs Command sequence
	*/
	exec(cs) {
		let maxtime = this.time;
		super.exec(cs);
		cs.forEach( x => {
			if (x.time < this.updatetime) this.updatetime = x.time;
		});
		if ( this.updatetime < this.inittime ) this.updatetime = this.inittime;
		if ( this.updatetime % 2 === 0 ) this.updatetime++;
		while( maxtime > this.time ) {
			this.M1.delete(maxtime);
			this.M2.delete(maxtime);
			maxtime--;
		}
	}


	/**
	* Bron-Kerbosch algorithm with pivoting for finding maximal cliques.
	*
	* ALGORITHM BK(R, P, X) IS
	*    IF P and X are both empty THEN
	*        report R as a maximal clique
	*    choose a pivot vertex u in P ⋃ X
	*    FOR each vertex v in P \ N(u) DO
	*        BK(R ⋃ {v}, P ⋂ N(v), X ⋂ N(v))
	*        P := P \ {v}
	*        X := X ⋃ {v}
	*
	* @param {numeric} t Time
	* @return {Vertex[][]} Maximal cliques at time t
	*/
	BronKerbosch(t) {
		const r = []; // The set of maximal cliques

		const obs = this.types([-1],t); // observers
		const V = this.space(obs,[1]); // Vertices
		const N = new WeakMap(); // Neighbours
		V.forEach( x => N.set(x,this.space([x],[1])) );
		V.sort( (a,b) => N.get(b).length - N.get(a).length ); // Higher deg first

		const stack = [];
		stack.push([[],V,[]]);

		while( stack.length ) {
			let [R,P,X] = stack.pop();

			if ( P.length === 0 && X.length === 0 ) {
				r.push(R.sort((a,b) => this.pos(a) - this.pos(b))); // Report R as a maximal clique
			}

			let u = [ ...P, ...X][0]; // Choose a pivot vertex
			let nu = N.get(u) || [];
			let pdiffnu = P.filter( x => !nu.includes(x) );

			while( pdiffnu.length ) {
				let v = pdiffnu.splice(0,1)[0];
				let nv = N.get(v);
				stack.push([
					[...new Set([...R,v])],
					P.filter( x => nv.includes(x) ),
					X.filter( x => nv.includes(x) )
				]);
				P.splice( P.indexOf(v) ,1);
				X = [ ...new Set([ ...X,v ]) ];
			}
		}
		return r;
	}


	/**
	* Calculate classical probabilities.
	*/
	calculateProbabilities() {
		for( let t=this.updatetime; t<=this.time; t+=2) {
			// Clear previous values
			const omega = this.types([1],t); // measure space tokens
			let n = omega.length;

			// METHOD #1
			this.M2.delete(t);
			// All outcomes
			let f = this.BronKerbosch(t);
			// Calculate the number of all quantum states
			let e = f.reduce( (a,b) => {
				return a + this.factorial( b.length );
			}, BigInt(0));
			// Calculate the probabilities
			let p = f.map( x => {
				return e ? Number( this.factorial(x.length) * 10000n / e ) / 10000 : 0;
			});
			// Set probabilities
			omega.forEach( v => v.p = 0 );
			f.forEach( (x,i) => {
				x.forEach( y => {
					y.p += p[i];
				});
			});

			// Energy and entropy
			const ef = f.reduce( (a,b) => { // Total free energy
				return a + BigInt(b.length) * this.factorial( b.length );
			}, BigInt(0));
			const ee = f.reduce( (a,b,i) => { // Expected energy at measurement
				return a + p[i] * b.length;
			}, 0);
			const h1 = - p.reduce( (a,b) => a + (b ? (b * Math.log2(b)) : 0), 0 );

			// Overlap D
			let ek = 0;
			let ekmax = 0;
			for(let i=0; i<f.length-1; i++) {
				for(let j=i+1; j<f.length; j++) {
					ek += 2 * f[i].filter( x => f[j].includes(x) ).length; // Intersection
					ekmax += f[i].length + f[j].length;
				}
			}
			let d = f.length === 1 ? NaN : (ekmax ? ek/ekmax : 0);

			// Set measurement results
			this.M1.set(t,{ omega: omega, f: f, p: p, ef: ef, ee: ee, h1: h1, d: d });

			// METHOD #2

			// Normalized hypervectors for each clique
			let hvs = Array(f.length).fill().map( (x,i) => {
				let v = Array(n).fill(0);
				let norm = 1 / Math.sqrt( f[i].length );
				f[i].forEach( y => v[ this.pos(y)-1 ] = norm );
				return v;
			});

			// Weighted sum of outer products
			let m = Array(n).fill().map( x => Array(n).fill(0) );
			hvs.forEach( (v,k) => {
				for(let i=0; i<n; i++) {
					m[i][i] += p[k] * v[i] * v[i];
					for(let j=i+1; j<n; j++) {
						m[i][j] += p[k] * v[i] * v[j];
						m[j][i] += p[k] * v[j] * v[i];
					}
				}
			});

			// Relative phases
			let theta = Array(f.length).fill().map( x => Array(f.length).fill(0) );
			for(let i=0; i<f.length-1; i++) {
				for(let j=i+1; j<f.length; j++) {
					let t1 = 2 * f[i].filter( x => f[j].includes(x) ).length; // Intersection
					let t2 = f[i].length + f[j].length;
					let th = this.round( (1 - (t1/t2)) * 90, 0 );
					theta[i][j] = -th;
					theta[j][i] = th;
				}
			}

			// Computational basis
			let maxl = Math.max( ...f.map( x => x.length ) );
			let fc = Array(n).fill().map( x => Array(maxl).fill(0) );
			f.forEach( (x,i) => {
				let l = x.length;
				for(let j=0; j<l; j++) {
					fc[this.pos(x[j])-1][l-1] += p[i] / l;
				}
			});
			let mc = Array(maxl).fill().map( x => Array(maxl).fill(0) );
			fc.forEach( x => {
				for(let i=0; i<maxl; i++) {
					if ( x[i] > 0 ) {
						mc[i][i] += x[i];
						for(let j=i+1; j<maxl; j++) {
							mc[i][j] += x[j];
							mc[j][i] += x[j];
						}
					}
				}
			});
			this.M2.set(t,{ rho: m, theta: theta, rhoc: mc });
		}
		this.updatetime = this.time;
	}

	/**
	* Hamming distance between two tokens.
	* Note: The times of two tokens must be the same.
	* @param {Vertex} x
	* @param {Vertex} y
	* @return {Object} Hamming distance or null if not valid
	*/
	hammingDistance( x, y ) {
		// The time must be the same and the types token
		if ( x.time !== y.time || x.type === 0 ) return null;

		// Unit hypervectors
		let ts = this.types([1],x.time);
		let hvs = new Map();
		ts.forEach( (t,i,arr) => {
			let bits = Array(arr.length).fill(false);
			bits[i] = true;
			hvs.set(t,bits);
		});

		// Spaces
		let sx = ts.filter( z => z==x || this.isSpacelike([x],[z]) );
		let sy = ts.filter( z => z==y || this.isSpacelike([y],[z]) );
		if( sx.length === 0 || sy.length === 0 ) return null;

		// Space as the bitwise sum of two hypervectors
		let hvsum = (a,b) => {
			return a.map( (z,i) => z | b[i] );
		};
		let sxhv = sx.reduce( (a,b) => hvsum(a,hvs.get(b)), hvs.get(sx[0]) );
		let syhv = sy.reduce( (a,b) => hvsum(a,hvs.get(b)), hvs.get(sy[0]) );

		// Hamming distance
		let d = sxhv.reduce( (a,b,i) => a + (b == syhv[i] ? 0 : 1), 0);

		// Result object
		let r = {
			x: { id: x.id, hv: sxhv.reduce((a,b)=>a+(b?'1':'0'),'') },
			y: { id: y.id, hv: syhv.reduce((a,b)=>a+(b?'1':'0'),'') },
			len: sxhv.length,
			d: d
		};

		return r;
	}

	/**
	* Cosine similarity between two tokens at the same time.
	* Note: The times of two tokens must be the same.
	* @param {Vertex} x
	* @param {Vertex} y
	* @return {Object} Cosine similarity or null if not valid
	*/
	cosineSimilarity( x, y ) {
		// The time must be the same and the types token
		if ( x.time !== y.time || x.type === 0 ) return null;

		// Unit hypervectors
		let ts = this.types([1],x.time);
		let hvs = new Map();
		ts.forEach( (t,i,arr) => {
			let bits = Array(arr.length).fill(0);
			bits[i] = 1;
			hvs.set(t,bits);
		});

		// Spaces
		let sx = ts.filter( z => z==x || this.isSpacelike([x],[z]) );
		let sy = ts.filter( z => z==y || this.isSpacelike([y],[z]) );
		if( sx.length === 0 || sy.length === 0 ) return null;

		// Space as the bitwise sum of two bipolar unit vectors
		let hvsum = (a,b) => {
			return a.map( (z,i) => z + b[i] );
		};
		let sxhv = sx.reduce( (a,b) => hvsum(a,hvs.get(b)), Array(ts.length).fill(0) );
		let syhv = sy.reduce( (a,b) => hvsum(a,hvs.get(b)), Array(ts.length).fill(0) );

		// Cosine similarity = cos(theta) = A*B / (||A||*||B||)
		let dotproduct = sxhv.reduce( (a,b,i) => a + ( b * syhv[i] ), 0);
		let magx = Math.sqrt( sxhv.reduce( (a,b) => a + (b*b), 0) );
		let magy = Math.sqrt( syhv.reduce( (a,b) => a + (b*b), 0) );
		let cs = dotproduct / (magx * magy);

		// Result object
		let r = {
			x: { id: x.id, hv: sxhv.reduce((a,b)=>a+(b==1?'+':'-'),'') },
			y: { id: y.id, hv: syhv.reduce((a,b)=>a+(b==1?'+':'-'),'') },
			dotproduct: dotproduct, magx: magx, magy: magy,
			cs: cs, cs2: cs*cs
		};

		return r;
	}


	/**
	* Get status.
	* @param {String[]} [titles=null] Selected vertices
	* @return {Object[]} Status object
	*/
	status(titles=null) {
		let s = [];
		let ss = '';

		// Final status, method 1
		let m = this.M1.get( this.time );
		if ( m ) {
			ss = 'Sample space, \\(|\\Omega|=' + m.omega.length + '\\):\n<table>';
			ss += '<tr><td>\\(\\quad\\Omega = \\)</td><td>{' + m.omega.map(x => this.pos(x)).join(',&#8203;') + '}</td></tr>';
			ss += '</table>';
			ss += 'Maximal cliques, \\(|\\mathcal{F}|=' + m.f.length + '\\):\n<table>';
			ss += '<tr><td>\\(\\quad\\mathcal{F} = \\)</td><td>{' + m.f.map( x => '{'+x.map( y => this.pos(y) ).join(',&#8203;')+'}' ).join(',&#8203;') + '}</td></tr>';
			ss += '</table>';
			ss += 'Probabilities:\n<table><tr><td>\\(\\quad Pr = \\)</td><td>(' + m.p.map( x => this.round(x,2,true) ).join(',&#8203;')+')</td></tr></table>';
			s.push( { id: "d1", text: ss });
		}

		// Final status, method 2
		m = this.M2.get( this.time );
		if ( m ) {
			ss = '<table><tr><td class="vmiddle">\\(\\rho = \\)</td><td>';
			ss += '<table class="densitymatrix">';
			m.rho.forEach( (x,i) => {
				ss += '<tr>';
				x.forEach( y => {
					let v = this.round(y,2);
					ss += '<td>' + ( (v==0 || v==1) ? v : v.toString().substring(1) ) + '</td>';
				});
				ss += '</tr>';
			});
			ss += '</table></td><tr></table>';
			s.push( { id: "d3", text: ss });

			ss = '<table><tr><td class="vmiddle">\\(\\theta = \\)</td><td>';
			ss += '<table class="densitymatrix">';
			m.theta.forEach( (x,i) => {
				ss += '<tr>';
				x.forEach( y => {
					let v = this.degreeToString( y );
					ss += '<td>' + v +  '</td>';
				});
				ss += '</tr>';
			});
			ss += '</table></td><tr></table>';
			s.push( { id: "d4", text: ss });

			const fmt = {
			  notation: 'scientific',
			  maximumFractionDigits: 2
			};
			ss = '<table class="timetable"><thead><tr><th>\\(t\\)</th><th>\\(E_{free}\\)</th><th>\\(\\langle E\\rangle\\)</th><th>\\(H_1\\)</th></th><th>\\(D\\)</th></thead></tr><tbody>'
			let l = m.length;
			for( let t=this.inittime; t<=this.time; t+=2) {
				let m1 = this.M1.get(t);
				let efstr = (m1.ef > 10000n ) ? m1.ef.toLocaleString( 'en-US', fmt ) : Number(m1.ef).toString();
				let eestr = this.round(m1.ee,1,true);
				let h1str = this.round(m1.h1,2,true);
				let dstr = this.round(m1.d,2,true);
				ss += '<tr><td>' + t + '</td><td>' + efstr + '</td><td>' + eestr + '</td><td>' + h1str + '</td><td>' + dstr +'</td></tr>';
			}
			ss += '</tbody></table>';
			s.push( { id: "d5", text: ss });

			ss = '<table><tr><td class="vmiddle">\\(\\rho_c = \\)</td><td>';
			ss += '<table class="densitymatrix">';
			m.rhoc.forEach( (x,i) => {
				ss += '<tr>';
				x.forEach( y => {
					let v = this.round(y,2);
					ss += '<td>' + ( (v==0 || v==1) ? v : v.toString().substring(1) ) + '</td>';
				});
				ss += '</tr>';
			});
			ss += '</table></td><tr></table>';
			s.push( { id: "d6", text: ss });
		}

		return s;
	}


}

export { BigraphQM };
