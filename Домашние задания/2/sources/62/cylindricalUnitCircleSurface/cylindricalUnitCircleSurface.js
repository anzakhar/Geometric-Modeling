// 2.js

"use strict";

function main() {
	const clock = new THREE.Clock();
	// create a scene, that will hold all our elements such as objects, cameras and lights.
    const scene = new THREE.Scene();
	
	// create a render and configure it with shadows
    const renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(new THREE.Color(0.8, 0.8, 0.8));
    renderer.setSize(window.innerWidth, window.innerHeight);
	
	const gui = new dat.GUI();
	
	// create a camera, which defines where we're looking at.
    let camera = new THREE.OrthographicCamera( window.innerWidth / -130, window.innerWidth / 130, window.innerHeight / 130,
                    window.innerHeight / - 130, -200, 500 );
					
	// add the output of the renderer to the html element
    document.body.appendChild(renderer.domElement);
	document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('mouseup', onDocumentMouseUp, false);	
	
	const trackballControls = initTrackballControls(camera, renderer);

    Data.init(scene, camera, trackballControls);

	gui.add(Data.controlsParameters, 'showAxes').onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	
	const guiCtrPointsParams = gui.addFolder('Control point parameters');
	const guiSurfaceParams = gui.addFolder('Cylindrial surface parameters');
	
	guiSurfaceParams.add(Data.controlsParameters, 'dx', -5, 5, 1).onChange(function (e) { Data.calculateAndDraw(); });
	guiSurfaceParams.add(Data.controlsParameters, 'dy', -5, 5, 1).onChange(function (e) { Data.calculateAndDraw(); });
	guiSurfaceParams.add(Data.controlsParameters, 'dz', -5, 5, 1).onChange(function (e) { Data.calculateAndDraw(); });	
	guiCtrPointsParams.add(Data.controlsParameters, 'showCtrPoints').onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	guiCtrPointsParams.add(Data.controlsParameters, 'controlPolygon').onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	
	guiSurfaceParams.add(Data.controlsParameters, 'cylindricalSurface').onChange(function (e) { Data.calculateAndDraw(); });
	guiSurfaceParams.add(Data.controlsParameters, 'visualize', ["wireframe", "solid"]).onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	guiSurfaceParams.add(Data.controlsParameters, 'slices', 2, 120, 1).onChange(function (e) { Data.calculateAndDraw(); });
	guiSurfaceParams.add(Data.controlsParameters, 'stacks', 2, 10, 1).onChange(function (e) { Data.calculateAndDraw(); });

    Data.generateControlPoints();
					
	camera.position.set(0, 0, 30);
		
	renderScene();

    function renderScene() {
		trackballControls.update(clock.getDelta());
        // render using requestAnimationFrame
        requestAnimationFrame(renderScene);
        renderer.render(scene, camera);
    }
}

class Point {
    constructor(x, y, z) {
        this.select = false;
        this.x = x;
        this.y = y;
        this.z = z;
        this.winx = 0.0;
        this.winz = 0.0;
        this.winy = 0.0;
    }
    setRect() {
        this.left = this.winx - 5;
        this.right = this.winx + 5;
        this.bottom = this.winy - 5;
        this.up = this.winy + 5;
    }
    calculateWindowCoordinates(object, camera) {
        //------------Get window coordinates of point-----------
        const vector = new THREE.Vector3();
        vector.setFromMatrixPosition(object.matrixWorld);
        vector.project(camera);
		
		const width = window.innerWidth, height = window.innerHeight;
        const widthHalf = width / 2, heightHalf = height / 2;

        vector.x = ( vector.x * widthHalf ) + widthHalf;
        vector.y = -( vector.y * heightHalf ) + heightHalf;

        this.winx = vector.x;
        this.winy = vector.y;
		this.winz = vector.z;

        this.setRect();//create a bounding rectangle around point
    }
    ptInRect(x, y) {
        const inX = this.left <= x && x <= this.right;
        const inY = this.bottom <= y && y <= this.up;
        return inX && inY;
    }
}

const Data = {
    pointsCtr: [],
	spritesCtr: [],
    indicesCtr: [],
    verticesCtr: {},
	controlPoligons: {},
    scene: null,
    movePoint: false,
    iMove: -1,
    leftButtonDown: false,
    N_ctr: null,
    lastPosX: 0,
    lastPosY: 0,
	materialSpritesCtr: null,
	materialSelectedSpritesCtr: null,
	materialControlPoligons: [],
	materialWireframeSurface: null,
	materialSolidSurface: null,
	geometrySurface: null,
	meshControlPoligons: null,
	meshSurface: null,
	camera: null,
	trackballControls: null,
	axes: null,
  	controlsParameters: {
		showAxes: true,
		showCtrPoints: true,
        controlPolygon: false,
		cylindricalSurface: false,
		paramCoords: "uniform",
		visualize: "wireframe",
		dx: 0,
		dy: 0,
		dz: 5,
		slices: 50,
		stacks: 2
	},
    init: function (scene, camera, trackballControls) {
        this.scene = scene;
		this.camera = camera;
		this.trackballControls = trackballControls;

        this.N_ctr = this.controlsParameters.N_ctr;
        this.M_ctr = this.controlsParameters.M_ctr;
		
		this.materialSpritesCtr = new THREE.SpriteMaterial({ color: 0x000000 });
		this.materialSelectedSpritesCtr = new THREE.SpriteMaterial({ color: 'rgb(50%,50%,0%)' });
		this.materialControlPoligons = new THREE.LineBasicMaterial({ color: 0x0000ff });
		this.materialSolidSurface = new THREE.MeshPhongMaterial({color: 'rgb(50%,50%,50%)', specular: 'rgb(50%,50%,50%)', shininess: 51, side: THREE.DoubleSide});
		this.materialWireframeSurface = new THREE.MeshBasicMaterial({ color: 'rgb(50%,50%,50%)', wireframe: true });
		// show axes in the screen
		this.axes = new THREE.AxesHelper(6);

        // ЗАДАТЬ КОЛИЧЕСТВО КОНТРОЛЬНЫХ ТОЧЕК
        this.N_ctr = 3;
        this.pointsCtr = new Array(this.N_ctr);
		this.verticesCtr = new Float32Array(this.N_ctr * 3);
        this.createIndicesCtr(this.N_ctr);
    },
	generateControlPoints: function () {

        this.add_coords(0, 1, 0);
        this.add_coords(1, 1, 1);
        this.add_coords(2, 0, 1);

        this.add_vertices();

        if (this.controlsParameters.cylindricalSurface)
            this.calculateCylindrialSurface();

        this.setVertexBuffersAndDraw();
    },
    setLeftButtonDown: function (value) {
        this.leftButtonDown = value;
    },
    add_coords: function (i, x, y, z = 0) {
        const pt = new Point(x, y, z);
        this.pointsCtr[i] = pt;
    },
	createIndicesCtr: function (n) {
        let i, k = 0;
        this.indicesCtr = new Array(n);

        for (i = 0; i < n; i++)
            this.indicesCtr[k++] = i;
		
		this.controlPoligons = new THREE.BufferGeometry();
		this.controlPoligons.setIndex( this.indicesCtr );
				
		this.meshControlPoligons = new THREE.Line( this.controlPoligons, this.materialControlPoligons);
    },
    mousemoveHandler: function (x, y) {
        if (this.leftButtonDown) {
            if (this.movePoint) {
                const offset = this.iMove;
				
				const vector = new THREE.Vector3();
				
				const width = window.innerWidth, height = window.innerHeight;
				const widthHalf = width / 2, heightHalf = height / 2;

				vector.x = ( x - widthHalf) / widthHalf;
				vector.y = -( y - heightHalf ) / heightHalf;
				vector.z = this.pointsCtr[this.iMove].winz;
				
				vector.unproject(this.camera);
			

                this.pointsCtr[this.iMove].x = vector.x;
                this.pointsCtr[this.iMove].y = vector.y;
                this.pointsCtr[this.iMove].z = vector.z;

                this.verticesCtr[offset * 3] = this.pointsCtr[this.iMove].x;
                this.verticesCtr[offset * 3 + 1] = this.pointsCtr[this.iMove].y;
                this.verticesCtr[offset * 3 + 2] = this.pointsCtr[this.iMove].z;

                if (this.controlsParameters.cylindricalSurface)
                    this.calculateCylindrialSurface();
            }
            this.setVertexBuffersAndDraw();
        }
        else {
			this.trackballControls.enabled = true;
			for (let i = 0; i < this.N_ctr; i++) {
				this.pointsCtr[i].select = false;
				this.pointsCtr[i].calculateWindowCoordinates(this.spritesCtr[i], this.camera);

				if (this.pointsCtr[i].ptInRect(x, y)) {
					this.pointsCtr[i].select = true;
					this.trackballControls.enabled = false;
				}
			}
			this.setVertexBuffersAndDraw();
		}
    },
    mousedownHandler: function (button, x, y) {
        if (button == 0) { //left button
			this.movePoint = false;

			for (let i = 0; i < this.N_ctr; i++)
				if (this.pointsCtr[i].select == true) {
					this.movePoint = true;
					this.iMove = i;
				}

			if (!this.movePoint) {
				this.lastPosX = x;
				this.lastPosY = y;
			}

			this.setLeftButtonDown(true);
        }
    },
    mouseupHandler: function (button, x, y) {
        if (button == 0) //left button
            this.setLeftButtonDown(false);
    },
    add_vertices: function () {
		for (let j = 0; j < this.N_ctr; j++) {
            this.verticesCtr[j * 3]     = this.pointsCtr[j].x;
            this.verticesCtr[j * 3 + 1] = this.pointsCtr[j].y;
            this.verticesCtr[j * 3 + 2] = this.pointsCtr[j].z;
        }
    },
    setVertexBuffersAndDraw: function () {
        // Clear scene
		this.scene.remove.apply(this.scene, this.scene.children);
		
		if (this.controlsParameters.showAxes)		
			this.scene.add(this.axes);

        // Draw
        if (this.controlsParameters.showCtrPoints)
			for (let i = 0; i < this.N_ctr; i++) {
				if (this.pointsCtr[i].select)
					this.spritesCtr[i] = new THREE.Sprite(this.materialSelectedSpritesCtr);
				else
					this.spritesCtr[i] = new THREE.Sprite(this.materialSpritesCtr);
				this.spritesCtr[i].position.set(this.pointsCtr[i].x, this.pointsCtr[i].y, this.pointsCtr[i].z);
				this.spritesCtr[i].scale.set(0.2, 0.2);
				this.scene.add(this.spritesCtr[i]);
			}
        if (this.controlsParameters.controlPolygon) {
			this.meshControlPoligons.geometry.setAttribute( 'position', new THREE.BufferAttribute( this.verticesCtr, 3 ) );
			this.scene.add(this.meshControlPoligons);
        }
        if (this.controlsParameters.cylindricalSurface) {
			switch (this.controlsParameters.visualize) {
			case "solid":
				this.meshSurface = new THREE.Mesh(this.geometrySurface, this.materialSolidSurface);
				this.scene.add(this.meshSurface);
				initDefaultLighting(this.scene, this.camera.position);
				break;
			case "wireframe":
				this.meshSurface = new THREE.Mesh(this.geometrySurface, this.materialWireframeSurface);
				this.scene.add(this.meshSurface);
				break;
			}
        }
    },
	calculateCtrPointsAndSurface: function () {
        this.generateControlPoints();
		this.calculateAndDraw();
    },
	calculateAndDraw: function () {
		if (this.controlsParameters.cylindricalSurface)
			this.calculateCylindrialSurface();
        
        this.setVertexBuffersAndDraw();
    },
     calculateCylindrialSurface: function() {

        let i, j;

        const N_ctr = this.N_ctr;
		const d = new Point(this.controlsParameters.dx, this.controlsParameters.dy, this.controlsParameters.dz);
		
		const sectorialSurface = (pointsCtr, d, N_ctr) => {
			return function ( u, v, target ) {
				// CALCULATE SPLINE COORDINATES
				const x = u;
				const y = v;
				const z = u+v;

				target.set( x, y, z );
			}
		};
		this.geometrySurface = new THREE.ParametricGeometry(	sectorialSurface(this.pointsCtr, d, N_ctr), 
																	this.controlsParameters.slices, 
																	this.controlsParameters.stacks);
    }
}

function mousedown(ev, canvas) {
    const x = ev.clientX; // x coordinate of a mouse pointer
    const y = ev.clientY; // y coordinate of a mouse pointer
    const rect = ev.target.getBoundingClientRect();

    Data.mousedownHandler(EventUtil.getButton(ev), x - rect.left, y - rect.top);
}
function onDocumentMouseDown(event) {
    const x = event.clientX; // x coordinate of a mouse pointer
    const y = event.clientY; // y coordinate of a mouse pointer
    const rect = event.target.getBoundingClientRect();

    Data.mousedownHandler(EventUtil.getButton(event), x - rect.left, y - rect.top);
}

function onDocumentMouseUp(event) {
    const x = event.clientX; // x coordinate of a mouse pointer
    const y = event.clientY; // y coordinate of a mouse pointer
    const rect = event.target.getBoundingClientRect();

    Data.mouseupHandler(EventUtil.getButton(event), x - rect.left, y - rect.top);
}

function onDocumentMouseMove(event) {
    const x = event.clientX; // x coordinate of a mouse pointer
    const y = event.clientY; // y coordinate of a mouse pointer
    const rect = event.target.getBoundingClientRect();

    Data.mousemoveHandler(x - rect.left, y - rect.top);
}