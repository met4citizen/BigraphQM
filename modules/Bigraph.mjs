/**
* @class Bipartite graph
* @author Mika Suominen
*/
class Bigraph {

	/**
	* @typedef {Object} Vertex
	* @property {number} id Identifier (internal use only)
	* @property {number} type 0=event, 1=token, -1=observer, -2=environment
	* @property {number} time Time
	* @property {Vertex[]} parent Set of parent vertices
	* @property {Vertex[]} child Set of child vertices
	*/

	/**
	* @typedef {Object} Command Reversible command
	* @property {number} op 1/-1=add/del vertex, 2/-2=add/del edge, 3/-3=move vertex
	* @property {number} id Identifier (vertex)
	* @property {number} type Type (vertex): 0=event, 1=token, -1=observer, -2=environment
	* @property {number} pos Last position (vertex, optional), used in del
	* @property {number} tail Tail id (edge)
	* @property {number} head Head id (edge)
	* @property {number} from From TIME index (move)
	* @property {number} to To TIME index (move)
	* @property {number} time Time (vertex/edge/move), Note: for edges the time of the head
	*/

	/**
	* @constructor
	*/
	constructor() {
		this.V = new Map(); // Map vertex id to vertex object
		this.TIME = new Map(); // Map time to objects
		this.TYPE = new Map(); // Map type to objects

		this.UNDO = []; // Undo buffer for command sequences
		this.REDO = []; // Redo buffer for undone sommand sequences
		this.maxu = 50; // Max # of command sequences in undo buffer

		this.id = 0; // Current maximum id
		this.time = 0; // Current maximum time (now)

		this.initcs = [ // Command sequence for initial state
			{ op: 1, id: 1, type: 0, time: 0 },
			{ op: 1, id: 2, type: -1, time: 1 },
			{ op: 1, id: 3, type: 1, time: 1 },
			{ op: 1, id: 4, type: -2, time: 1 },
			{ op: 2, tail: 1, head: 2, time: 1 },
			{ op: 2, tail: 1, head: 3, time: 1 },
			{ op: 2, tail: 1, head: 4, time: 1 }
		];
		this.exec(this.initcs);
		this.inittime = 1; // Time after initial state
	}

	/**
	* Reset.
	*/
	reset() {
		this.V.clear();
		this.TIME.clear();
		this.TYPE.clear();

		this.id = 0;
		this.time = 0;

		this.exec(this.initcs);

		this.UNDO.length = 0;
		this.REDO.length = 0;
	}


	/**
	* Execute an operation.
	* @param {Command[]} cs Command sequence
	*/
	exec(cs) {
		cs.forEach( c => {
			if( c.op === 1 ){ // Add vertex
				const v = { id: c.id, type: c.type, time: c.time, parent: [], child: [] };
				this.V.set(c.id,v);
				if ( c.id > this.id ) this.id = c.id;
				const t = this.TYPE.get( v.type );
				t ? t.push( v ) : this.TYPE.set( v.type, [ v ] );
				const l = this.TIME.get( v.time );
				l ? (c.pos ? l.splice(c.pos,0,v) : l.push( v )) : this.TIME.set( v.time, [ v ] );
				if ( v.time > this.time ) this.time = v.time;
			} else if ( c.op === -1 ) { // Del vertex
				const v = this.V.get(c.id);
				const l = this.TIME.get( v.time );
				c.pos = l.indexOf( v );
				l.splice( c.pos, 1 );
				if ( l.length === 0 ) {
					this.TIME.delete( v.time );
					if ( v.time <= this.time ) this.time = v.time - 1;
				}
				const t = this.TYPE.get( v.type );
				t.splice( t.indexOf( v ), 1 );
				this.V.delete(c.id);
			} else if ( c.op === 2 ) { // Add link
				const x = this.V.get(c.tail);
				const y = this.V.get(c.head);
				x.child.push(y);
				y.parent.push(x);
			} else if ( c.op === -2 ) { // Del link
				const x = this.V.get(c.tail);
				const y = this.V.get(c.head);
				x.child.splice( x.child.indexOf(y), 1);
				y.parent.splice( y.parent.indexOf(x), 1);
			} else if ( c.op === 3 ) { // Move
				const t = this.TIME.get(c.time);
				const elems = t.splice( c.from, 1);
				t.splice( c.to, 0, ...elems);
			} else if ( c.op === -3 ) { // Move reverse
				const t = this.TIME.get(c.time);
				const elems = t.splice( c.to, 1);
				t.splice( c.from, 0, ...elems);
			}
		});
	}


	/**
	* Record operation to undo buffer.
	* @param {Command[]} cs Command sequence
	*/
	record(cs) {
		this.REDO.length = 0;
		this.UNDO.push(cs);
		while ( this.UNDO.length > this.maxu ) {
			this.UNDO.shift();
		}
	}

	/**
	* Undo the last operation.
	*/
	undo() {
		if ( this.UNDO.length > 0 ) {
			let cs = this.UNDO.pop();
			this.exec( cs.map( x => ({...x, op: -x.op})).reverse() );
			this.REDO.push(cs);
		}
	}

	/**
	* Redo the latest undone operation.
	*/
	redo() {
		if ( this.REDO.length > 0 ) {
			let cs = this.REDO.pop();
			this.exec(cs);
			this.UNDO.push(cs);
		}
	}

	/**
	* Get the vertex's position within its own time slice.
	* @param {Vertex} v Vertex
	* @return {numeric} Position
	*/
	pos(v) {
		return this.TIME.get(v.time).indexOf(v);
	}

	/**
	* Get the vertex's title.
	* @param {Vertex} v Vertex
	* @return {String} Title in the format "time.position"
	*/
	title(v) {
		return v.time + '.' + this.pos(v);
	}

	/**
	* Get vertex object based on its title.
	* @param {String} title Title
	* @return {Vertex} Vertex
	*/
	v(title) {
		let [t,pos] = title.split('.').map(Number);
		return this.TIME.get(t)[pos];
	}

	/**
	* Check if there is currently an edge between two vertices.
	* @param {Vertex} v1
	* @param {Vertex} v2
	* @return {boolean} True, if edge exists
	*/
	isEdge( v1, v2 ) {
		let tail = v1,head = v2;
		if ( tail.time > head.time ) [tail,head] = [head,tail];
		return tail.child.includes(head);
	}

	/**
	* Check if an edge is allowed between two vertices.
	* Note: Doesn't check whether there is an edge or not.
	* @param {Vertex} v1
	* @param {Vertex} v2
	* @return {boolean} True if an edge is allowed
	*/
	isAllowedEdge( v1, v2 ) {
		let tail = v1,head =v2;
		if ( tail.time > head.time ) [tail,head] = [head,tail];
		return (tail.time+1 == head.time) &&
			( tail.type < 0 || this.isSpacelike([tail],[head]) );
	}

	/**
	* Check if a new branch is allowed.
	* @param {Vertex} v Root
	*/
	isAllowedBranch( v ) {
		return v.time >= this.inittime &&( v.child.length === 0 || v.type > 0 ||
			(v.type === 0 && v.parent[0].type > 0) );
	}

	/**
	* Get vertices with certain type.
	* @param {number[]} types Types
	* @param {number} [time=null] Time, if null use the current.
	* @return {Vertex[]} Set of vertices
	*/
	types( types, time=null ) {
		const l = this.TIME.get( time ? time : this.time );
		return l ? l.filter(x => types.includes(x.type) ) : [];
	}

	/**
	* Check if two vertices are spacelike i.e. all the lowest common ancestors
	* are events.
	* @param {Vertex[]} vs1
	* @param {Vertex[]} vs2
	* @return {boolean} True if spacelike.
	*/
	isSpacelike( vs1, vs2 ) {
		// If empty, not spacelike
		if ( !(vs1 && vs2 && vs1.length && vs2.length) ) return false;
		let s1 = vs1;
		let s2 = vs2;

		// Check timelike and overlap
		while( s1[0].time > s2[0].time ) s1 = [...new Set( s1.map(x => x.parent).flat() )];
		while( s2[0].time > s1[0].time ) s2 = [...new Set( s2.map(x => x.parent).flat() )];
		if ( s1.some(x => s2.includes(x) ) ) return false;

		// If some LCA is a token, not spacelike
		while( s1.length && s2.length ) {
			s1 = [ ...new Set( s1.map(x => x.parent).flat() ) ];
			s2 = [ ...new Set( s2.map(x => x.parent).flat() ) ];

			// Get intersection and differences
			let is;
			[s1,is,s2] = s1.reduce( (a,b) => {
    		let idx = a[2].indexOf(b);
    		if ( idx === -1 ) {
        	a[0].push(b);
    		} else {
        	a[1].push(b);
        	a[2].splice(idx,1);
    		}
    		return a;
			}, [[],[],s2] );

			// If some intersection is a token, not spacelike
			if ( is.length && is.some(x => x.type !== 0) ) return false;
		}

		return true;
	}

	/**
	* Get space i.e. all spacelike vertices relative to references.
	* @param {Vertex[]} vs Reference vertices
	* @param {number[]} [types=null] Allowed types, null=allow all
	* @return {Vertex[]} Spacelike vertices at the same time.
	*/
	space( vs, types=null ) {
		const l = (vs && vs.length) ? this.TIME.get( vs[0].time ) : [];
		return l.filter(x => (!types || types.includes(x.type)) && this.isSpacelike(vs,[x]));
	}

	/**
	* Add new layer and populate it by extending existing sequences.
	* @param {Command[]} [cs=null] Command sequence
	*/
	incTime(cs=null) {
		let croot = cs == null;
		if (croot) cs = [];

		const o = this.types([-1]); // Observers
		const s = this.space(o,[1]); // Spacelike tokens
		const e = this.types([-2]); // Environment

		this.time+=2;
		o.forEach( v => this.addBranch(v,v.type,cs) );
		s.forEach( v => this.addBranch(v,v.type,cs) );
		e.forEach( v => this.addBranch(v,v.type,cs) );

		if (croot && cs.length) this.record(cs);
	}

	/**
	* Remove the last time slice.
	* @param {Command[]} [cs=null] Command sequence
	*/
	decTime(cs=null) {
		if ( this.time > this.inittime ) {
			let croot = cs == null;
			if (croot) cs = [];

			const vs = [
				...this.TIME.get(this.time).slice().reverse(),
				...this.TIME.get(this.time-1).slice().reverse()
			];
			if ( vs.length ) {
				const c = [];
				vs.forEach( v => {
					v.parent.forEach( p => {
						c.push({ op: -2, tail: p.id, head: v.id, time: v.time });
					});
				});
				vs.forEach( v => c.push({ op: -1, id: v.id, type: v.type, time: v.time }) );

				cs.push(...c);
				this.exec(c);
				if (croot) this.record(cs);
			}
		}
	}

	/**
	* Get branch.
	* @param {Vertex} v Vertex
	* @return {Vertex[]} Vertices in the branch
	*/
	branch( v ) {
		// Allow these vertices
		let allow = (x) => {
			return x && x.time > this.inittime && x.type >=0 &&
				(x.type > 0 || x.parent[0].type > 0);
		};

		const b = []; // Branch
		if ( allow(v) ) {
			b.push(v);
			let up = [ v ]; // Next up
			let down = [ v ]; // Next down
			while( up.length || down.length ) {
				const fup = []; // Found
				const fdown = []; // Found
				up.forEach( x => {
					x.parent.forEach( y => {
						if ( allow(y) && y.child.length === 1 ) fup.push(y);
					});
				});
				down.forEach( x => {
					x.child.forEach( y => {
						if ( allow(y) ) fdown.push(y);
					});
				});
				b.push(...fup,...fdown);
				up = fup;
				down = fdown;
			}
		}
		return b;
	}

	/**
	* Add a new branch.
	* @param {Vertex} v Root vertex
	* @param {number} [type=1] Token type
	* @param {Command[]} [cs=null] Command sequence
	*/
	addBranch( v, type=1, cs=null ) {
		let croot = cs == null;
		if (croot) cs = [];

		if ( v ) {
			if ( v.time == this.time ) {
				this.incTime(cs);
				if (croot) this.record(cs);
			} else {
				if ( this.isAllowedBranch(v) ) {
					let t = (v.type != 0) ? 0 : type;
					let i = v.id;

					for( let l=v.time+1; l<=this.time; l++ ) {
						// Create and connect the new vertex
						const c = [];
						c.push({ op: 1, id: ++this.id, type: t, time: l });
						c.push({ op: 2, tail: i, head: this.id, time: l });
						cs.push(...c);
						this.exec(c);

						// Move the new token
						if ( t === 1 ) {
							const m = [];
							this.move( this.V.get(this.id), null, m );
							cs.push(...m);
						}

						t = t ? 0 : type;
						i = this.id;
					}
					if (croot && cs.length) this.record(cs);
				}
			}
		}
	}

	/**
	* Delete a branch spanned by a vertex.
	* @param {Vertex} v Vertex
	* @param {Command[]} [cs=null] Command sequence
	*/
	delBranch( v, cs=null ) {
		let croot = cs == null;
		if (croot) cs = [];

		const vs = this.branch(v);
		if ( vs.length ) {
			const c = [];
			vs.forEach( x => {
				x.parent.forEach( y => {
					c.push({ op: -2, tail: y.id, head: x.id, time: x.time });
				});
			});
			vs.forEach( x => c.push({ op: -1, id: x.id, type: x.type, time: x.time }) );

			cs.push(...c);
			this.exec(c);
			if (croot) this.record(cs);
		}
	}

	/**
	* Check and prune edges below certain time.
	* @param {number} [time=1] Starting time
	* @param {Command[]} [cs=null] Command sequence
	*/
	pruneEdges( time=1, cs=null ) {
		let croot = cs == null;
		if (croot) cs = [];

		for(let i=time; i<this.time; i++ ) {
			const l = this.TIME.get(i);
			l.forEach( x => {
				if ( x.child.length > 1 ) {
					x.child.forEach( y => {
						let p = y.parent.filter(z => z != x);
						if ( p.length && !this.isSpacelike([x],p) ) {
							const c = { op: -2, tail: x.id, head: y.id, time: y.time };
							cs.push(c);
							this.exec([c]);
						}
					});
				}
			});
		}
		if (croot && cs.length) this.record(cs);
	}


	/**
	* Add a new edge between x and y.
	* @param {Vertex} x
	* @param {Vertex} y
	* @param {Command[]} [cs=null] Command sequence
	*/
	addEdge( x, y, cs=null ) {
		let croot = cs == null;
		if (croot) cs = [];

		let tail = x,head = y;
		if ( tail.time > head.time ) [tail,head] = [head,tail];

		if ( !this.isEdge(tail,head) && this.isAllowedEdge(tail,head) ) {
			let c = { op: 2, tail: tail.id, head: head.id, time: head.time };
			cs.push(c);
			this.exec([c]);

			this.pruneEdges( head.time, cs );

			if (croot) this.record(cs);
		}
	}

	/**
	* Delete an edge between two vertices.
	* @param {Vertex} x
	* @param {Vertex} y
	* @param {Command[]} [cs=null] Command sequence
	*/
	delEdge( x, y, cs=null ) {
		let croot = cs == null;
		if (croot) cs = [];

		let tail = x, head = y;
		if ( tail.time > head.time ) [tail,head] = [head,tail];

		if ( this.isEdge(tail,head) && tail.child.length > 1 && head.parent.length > 1) {
			let c = { op: -2, tail: tail.id, head: head.id, time: head.time };
			cs.push(c);
			this.exec([c]);

			this.pruneEdges( head.time, cs );

			if (croot) this.record(cs);
		}
	}

	/**
	* Move vertex x before y.
	* @param {Vertex} x Vertex to be moved
	* @param {Vertex} y Verted before which it is moved, if null find optimal place
	* @param {Command[]} [cs=null] Command sequence
	*/
	move( x, y, cs=null ) {
		let croot = cs == null;
		if (croot) cs = [];

		if ( x ) {
			const t = this.TIME.get(x.time);
			let from = t.indexOf(x);
			let to;
			if ( y == null ) {
				// Find the optimal position for the new token
				to = from;
				let dmin = Number.POSITIVE_INFINITY;
				for( let i=1; i<t.length-1; i++) {
					if ( t[i] === x || t[i].type !== 1 ) continue;
					let d = this.distance(x,t[i]);
					if ( d <= dmin ) {
						dmin = d;
						to = i+1;
					}
				}
			} else {
				to = t.indexOf(y);
			}
			let c = { op: 3, from: from, to: to, time: x.time };
			cs.push(c);
			this.exec([c]);
			if (croot) this.record(cs);
		}
	}


	/**
	* BFS generator function.
	* @generator
	* @param {Vertex} v Root vertex
	* @yields {Vertex[]} Next leafs
	*/
	*bfs( v ) {
		let s = [ v ];
		let vs = [];
		while( s.length ) {
			// Yield the process; client can filter the search set
			let or = yield s;
			if ( or ) s = or;
			const l = [];
			for( const x of s) {
				l.push( ...x.parent )
				l.push( ...x.child );
			}
			vs = [ ...new Set( [ ...vs, ...s ] ) ]; // Set Union
			s = [ ...new Set( l ) ].filter( x => !vs.includes(x) ); // Set Difference
		}
	}

	/**
	* Minimum distance between two vertices.
	* @param {Vertex} v1 First vertex
	* @param {Vertex} v2 Second vertex
	* @return {number} Number of step from v1 to v2
	*/
	distance( x, y ) {
		const gx = this.bfs( x );
		const gy = this.bfs( y );
		let m, n = { value: [] }, d = -1;
		// Bidirectional BFS
		while( true ) {
			m = gx.next();
			if ( m.done ) return Number.POSITIVE_INFINITY; // Not connected
			if ( m.value.some( x => n.value.includes( x ) ) ) break;
			d++;
			n = gy.next();
			if ( n.done ) return Number.POSITIVE_INFINITY; // Not connected
			if ( n.value.some( x => m.value.includes( x ) ) ) break;
			d++;
		}
		return d;
	}

}

export { Bigraph };
