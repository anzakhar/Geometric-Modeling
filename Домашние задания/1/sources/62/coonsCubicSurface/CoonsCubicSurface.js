// 2.js

// Imports.
import * as THREE from './libs/three.module.js'
import { TrackballControls } from './libs/TrackballControls.js';
import { ParametricGeometry } from './libs/ParametricGeometry.js';
import * as  dat from './libs/dat.gui.module.js';
import {EventUtil} from './libs/EventUtil.js';
import {initDefaultLighting} from './libs/util.js';

async function main() {
	const clock = new THREE.Clock();
	// create a scene, that will hold all our elements such as objects, cameras and lights.
    const scene = new THREE.Scene();
	
	// create a render and configure it with shadows
    const renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(new THREE.Color(0.8, 0.8, 0.8));
    renderer.setSize(window.innerWidth, window.innerHeight);
	
	const gui = new dat.GUI();
	
	// create a camera, which defines where we're looking at.
    let camera = new THREE.OrthographicCamera( window.innerWidth / -100, window.innerWidth / 100, window.innerHeight / 100,
                    window.innerHeight / -100, -200, 500 );
					
	// add the output of the renderer to the html element
    document.body.appendChild(renderer.domElement);
	document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('mouseup', onDocumentMouseUp, false);	
	
	const trackballControls = new TrackballControls(camera, renderer.domElement);

    Data.init(scene, camera, trackballControls);

	gui.add(Data.controlsParameters, 'showAxes').onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	
	const guiCtrPointsParams = gui.addFolder('Control point parameters');
	const guiAreaBounds = guiCtrPointsParams.addFolder('Area Bounds');
	const guiCountControlPoints = guiCtrPointsParams.addFolder('Count control points');
	const guiSplineParams = gui.addFolder('Spline parameters');
	
	guiAreaBounds.add(Data.controlsParameters, 'Xmin', 0, 3 * Math.PI).onChange(function (e) { Data.setDependentGeomParameters(); Data.generateControlPoints(); });
	guiAreaBounds.add(Data.controlsParameters, 'Xmax', 0, 3 * Math.PI).onChange(function (e) { Data.setDependentGeomParameters(); Data.generateControlPoints(); });
	guiAreaBounds.add(Data.controlsParameters, 'Ymin', 0, 3 * Math.PI).onChange(function (e) { Data.setDependentGeomParameters(); Data.generateControlPoints(); });
	guiAreaBounds.add(Data.controlsParameters, 'Ymax', 0, 3 * Math.PI).onChange(function (e) { Data.setDependentGeomParameters(); Data.generateControlPoints(); });
	guiAreaBounds.add(Data.controlsParameters, 'Z', 0, 5).onChange(function (e) { Data.setDependentGeomParameters(); Data.generateControlPoints(); });
	guiCountControlPoints.add(Data.controlsParameters, 'N_ctr', 2, 8, 1).onChange(function (e) { Data.generateControlPoints(); });
	guiCountControlPoints.add(Data.controlsParameters, 'M_ctr', 2, 8, 1).onChange(function (e) { Data.generateControlPoints(); });
	guiCtrPointsParams.add(Data.controlsParameters, 'showCtrPoints').onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	guiCtrPointsParams.add(Data.controlsParameters, 'controlNet').onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	
	guiSplineParams.add(Data.controlsParameters, 'coonsCubicSurface').onChange(function (e) { Data.calculateAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'paramCoords', ["uniform", "chordal", "centripetal"]).onChange(function (e) { Data.calculateAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'visualize', ["wireframe", "solid"]).onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'slices', 2, 120, 1).onChange(function (e) { Data.calculateAndDraw(); });
	guiSplineParams.add(Data.controlsParameters, 'stacks', 2, 120, 1).onChange(function (e) { Data.calculateAndDraw(); });

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
        // ДОБАВИТЬ ПАРАМЕТРИЧЕСКИЕ КООРДИНАТЫ u и v
        this.x = x;
        this.y = y;
        this.z = z;
        this.winx = 0.0;
        this.winz = 0.0;
        this.winy = 0.0;
    }
    setPoint(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.setRect();
    }
    setRect() {
        this.left = this.winx - 10;
        this.right = this.winx + 10;
        this.bottom = this.winy - 10;
        this.up = this.winy + 10;
    }
    calculateWindowCoordinates(camera) {
        //------------Get window coordinates of point-----------
        const vector = new THREE.Vector3(this.x, this.y, this.z);
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
    m10PointsCtr: [],
    m01PointsCtr: [],
    m11PointsCtr: [],
    m10Ctr: [],
    m01Ctr: [],
    m11Ctr: [],
    pointsVector10Ctr: [],
    pointsVector01Ctr: [],
    pointsVector11Ctr: [],
	spritesCtr: [],
    indicesCtr: [],
    verticesCtr: {},
    verticesVector10Ctr: {},
    verticesVector01Ctr: {},
    verticesVector11Ctr: {},
    coneTips10: {},
    coneTips01: {},
    coneTips11: {},
    colorsVector10Ctr: {},
    colorsVector01Ctr: {},
    colorsVector11Ctr: {},
	controlPoligons: {},
    scene: null,
    movePoint: false,
    moveVector10: false,
    moveVector01: false,
    moveVector11: false,
    iMove: -1,
    jMove: -1,
    OldPt: null,
    OldPtm10: null,
    OldPtm01: null,
    OldPtm11: null,
    tPt: null,
    leftButtonDown: false,
    Xmid: 0.0,
    Ymid: 0.0,
    lastPosX: 0,
    lastPosY: 0,
	materialSpritesCtr: null,
	materialSelectedSpritesCtr: null,
	materialControlPoligons: [],
    materialConeTip: null,
    materialConeTipSelect: null,
	materialWireframeSplineSurface: null,
	materialSolidSplineSurface: null,
	geometrySplineSurface: null,
	meshControlPoligons: null,
	meshSplineSurface: null,
	camera: null,
	trackballControls: null,
	axes: null,
  	controlsParameters: {
		showAxes: true,
		Xmin: 0.0,
		Xmax: 3 * Math.PI,
		Ymin: 0.0,
		Ymax: 3 * Math.PI,
		Z: 1.5,
		N_ctr: 4, 
		M_ctr: 4,
		showCtrPoints: true,
        controlNet: false,
		coonsCubicSurface: false,
		paramCoords: "uniform",
		visualize: "wireframe",
		slices: 8,
		stacks: 8
	},
    init: function (scene, camera, trackballControls) {
        this.scene = scene;
		this.camera = camera;
		this.trackballControls = trackballControls;

		this.materialSpritesCtr = new THREE.SpriteMaterial({ color: 0x000000 });
		this.materialSelectedSpritesCtr = new THREE.SpriteMaterial({ color: 'rgb(50%,50%,0%)' });
		this.materialControlPoligons = [new THREE.LineBasicMaterial({ color: 0x00ff00 }), new THREE.LineBasicMaterial({ color: 0x0000ff })];
		this.materialSolidSplineSurface = new THREE.MeshPhongMaterial({color: 'rgb(50%,50%,50%)', specular: 'rgb(50%,50%,50%)', shininess: 51, side: THREE.DoubleSide});
		this.materialWireframeSplineSurface = new THREE.MeshBasicMaterial({ color: 'rgb(50%,50%,50%)', wireframe: true });
        this.materialConeTip = new THREE.MeshBasicMaterial( {color: 0x000000} );
        const color = new THREE.Color().setRGB( 0.5, 0.5, 0.0 );
        this.materialConeTipSelect = new THREE.MeshBasicMaterial( {color: color} );
		// show axes in the screen
		this.axes = new THREE.AxesHelper(6);

        this.lengthVector = 1.5;
        this.heighTip = 0.4 * this.lengthVector;

        this.setDependentGeomParameters();

        this.OldPt = new Point(0, 0);
        this.OldPtm10 = new Point(0, 0);
        this.OldPtm01 = new Point(0, 0);
        this.OldPtm11 = new Point(0, 0);
        this.tPt = new Point(0, 0);
    },
    setDependentGeomParameters: function () {
		const Xmin = this.controlsParameters.Xmin,
			  Xmax = this.controlsParameters.Xmax, 
			  Ymin = this.controlsParameters.Ymin, 
			  Ymax = this.controlsParameters.Ymax, 
			  Z = this.controlsParameters.Z;
        this.Xmid = Xmin + (Xmax - Xmin) / 2.0;
        this.Ymid = Ymin + (Ymax - Ymin) / 2.0;
    },
    generateControlPoints: function () {
		const Xmin = this.controlsParameters.Xmin,
			  Xmax = this.controlsParameters.Xmax, 
			  Ymin = this.controlsParameters.Ymin, 
			  Ymax = this.controlsParameters.Ymax, 
			  Z = this.controlsParameters.Z,
			  N_ctr = this.controlsParameters.N_ctr,
			  M_ctr = this.controlsParameters.M_ctr;
        this.pointsCtr = new Array(N_ctr);
        this.m10Ctr = new Array(N_ctr);
        this.m01Ctr = new Array(N_ctr);
        this.m11Ctr = new Array(N_ctr);
        this.m10PointsCtr = new Array(N_ctr);
        this.m01PointsCtr = new Array(N_ctr);
        this.m11PointsCtr = new Array(N_ctr);
        this.pointsVector10Ctr = new Array(N_ctr);
        this.pointsVector01Ctr = new Array(N_ctr);
        this.pointsVector11Ctr = new Array(N_ctr);
        this.spritesCtr = new Array(N_ctr);
        this.coneTips10 = new Array(N_ctr);
        this.coneTips01 = new Array(N_ctr);
        this.coneTips11 = new Array(N_ctr);

        for (let i = 0; i < N_ctr; i++) {
            this.pointsCtr[i] = new Array(M_ctr);
            this.m10Ctr[i] = new Array(M_ctr);
            this.m01Ctr[i] = new Array(M_ctr);
            this.m11Ctr[i] = new Array(M_ctr);
            this.m10PointsCtr[i] = new Array(M_ctr);
            this.m01PointsCtr[i] = new Array(M_ctr);
            this.m11PointsCtr[i] = new Array(M_ctr);
            this.pointsVector10Ctr[i] = new Array(M_ctr);
            this.pointsVector01Ctr[i] = new Array(M_ctr);
            this.pointsVector11Ctr[i] = new Array(M_ctr);
            for (let j = 0; j < M_ctr; j++) {
                this.pointsVector10Ctr[i][j] = new Array(2);
                this.pointsVector01Ctr[i][j] = new Array(2);
                this.pointsVector11Ctr[i][j] = new Array(2);
            }
			this.spritesCtr[i] = new Array(M_ctr);
            this.coneTips10[i] = new Array(M_ctr);
            this.coneTips01[i] = new Array(M_ctr);
            this.coneTips11[i] = new Array(M_ctr);
		}

        this.create_coord_tip(this.heighTip, N_ctr, M_ctr);

        for (let i = 0; i < N_ctr; i++)
            for (let j = 0; j < M_ctr; j++) {

                if ((i > 1) && (i < N_ctr-2) && (j > 1) && (j < M_ctr-2))
                    continue;

                const x = Xmin + i * (Xmax - Xmin) / (N_ctr - 1) - this.Xmid;
                const y = Ymin + j * (Ymax - Ymin) / (M_ctr - 1) - this.Ymid;
                const z = Z * Math.sin(x) * Math.sin(y);

                this.add_coords(i, j, x, y, z);
            }

        let x, y, z;
        let pt;
        let vec;

        for (let i = 0; i < N_ctr; i++)
            for (let j = 0; j < M_ctr; j++) {

            if ((i > 0) && (i < N_ctr-1) && (j > 0) && (j < M_ctr-1))
                continue;

            x = 0.0;
            y = 0.0;
            z = 0.0;

            if (i == N_ctr - 1) {
                x = this.pointsCtr[i][j].x - this.pointsCtr[i - 1][j].x;
                y = this.pointsCtr[i][j].y - this.pointsCtr[i - 1][j].y;
                z = this.pointsCtr[i][j].z - this.pointsCtr[i - 1][j].z;
            }
            if (i == 0) {
                x = this.pointsCtr[i + 1][j].x - this.pointsCtr[i][j].x;
                y = this.pointsCtr[i + 1][j].y - this.pointsCtr[i][j].y;
                z = this.pointsCtr[i + 1][j].z - this.pointsCtr[i][j].z;
            }

            vec = new THREE.Vector3( x, y, z );
            vec.normalize();
            vec.multiplyScalar(this.lengthVector)

            pt = new Point(vec.getComponent(0), vec.getComponent(1), vec.getComponent(2));

            this.m10Ctr[i][j] = pt;

            x = 0.0;
            y = 0.0;
            z = 0.0;

            if (j == M_ctr - 1) {
                x = this.pointsCtr[i][j].x - this.pointsCtr[i][j - 1].x;
                y = this.pointsCtr[i][j].y - this.pointsCtr[i][j - 1].y;
                z = this.pointsCtr[i][j].z - this.pointsCtr[i][j - 1].z;
            }
            if (j == 0) {
                x = this.pointsCtr[i][j + 1].x - this.pointsCtr[i][j].x;
                y = this.pointsCtr[i][j + 1].y - this.pointsCtr[i][j].y;
                z = this.pointsCtr[i][j + 1].z - this.pointsCtr[i][j].z;
            }

            vec = new THREE.Vector3( x, y, z );
            vec.normalize();
            vec.multiplyScalar(this.lengthVector)

            pt = new Point(vec.getComponent(0), vec.getComponent(1), vec.getComponent(2));

            this.m01Ctr[i][j] = pt;
        }

        for (let i = 0; i < N_ctr; i++)
            for (let j = 0; j < M_ctr; j++) {

                if ((i > 0) && (i < N_ctr-1) && (j > 0) && (j < M_ctr-1))
                    continue;

                x = 0.0;
                y = 0.0;
                z = 0.0;

                if ((j == M_ctr - 1) && ((i == 0) || (i == N_ctr - 1))) {
                    x = this.m10Ctr[i][j].x - this.m10Ctr[i][j - 1].x;
                    y = this.m10Ctr[i][j].y - this.m10Ctr[i][j - 1].y;
                    z = this.m10Ctr[i][j].z - this.m10Ctr[i][j - 1].z;
                }
                if ((j == 0) && ((i == 0) || (i == N_ctr - 1))) {
                    x = this.m10Ctr[i][j + 1].x - this.m10Ctr[i][j].x;
                    y = this.m10Ctr[i][j + 1].y - this.m10Ctr[i][j].y;
                    z = this.m10Ctr[i][j + 1].z - this.m10Ctr[i][j].z;
                }

                vec = new THREE.Vector3( x, y, z );
                vec.normalize();
                vec.multiplyScalar(this.lengthVector)
    
                pt = new Point(vec.getComponent(0), vec.getComponent(1), vec.getComponent(2));

                this.m11Ctr[i][j] = pt;

                x = this.pointsCtr[i][j].x + this.m10Ctr[i][j].x;
                y = this.pointsCtr[i][j].y + this.m10Ctr[i][j].y;
                z = this.pointsCtr[i][j].z + this.m10Ctr[i][j].z;
                pt = new Point(x, y, z);
                this.m10PointsCtr[i][j] = pt;

                x = this.pointsCtr[i][j].x + this.m01Ctr[i][j].x;
                y = this.pointsCtr[i][j].y + this.m01Ctr[i][j].y;
                z = this.pointsCtr[i][j].z + this.m01Ctr[i][j].z;
                pt = new Point(x, y, z);
                this.m01PointsCtr[i][j] = pt;

                x = this.pointsCtr[i][j].x + this.m11Ctr[i][j].x;
                y = this.pointsCtr[i][j].y + this.m11Ctr[i][j].y;
                z = this.pointsCtr[i][j].z + this.m11Ctr[i][j].z;
                pt = new Point(x, y, z);
                this.m11PointsCtr[i][j] = pt;

                if ((i == 0) || (i == N_ctr - 1))
                    this.setVector(this.pointsCtr[i][j].x, this.pointsCtr[i][j].y, this.pointsCtr[i][j].z,
                        this.m10PointsCtr[i][j].x, this.m10PointsCtr[i][j].y, this.m10PointsCtr[i][j].z,
                        "10", true, i, j);

                if ((j == 0) || (j == M_ctr - 1))
                    this.setVector(this.pointsCtr[i][j].x, this.pointsCtr[i][j].y, this.pointsCtr[i][j].z,
                        this.m01PointsCtr[i][j].x, this.m01PointsCtr[i][j].y, this.m01PointsCtr[i][j].z,
                        "01", true, i, j);

                if (((i == 0) || (i == N_ctr - 1)) && ((j == 0) || (j == M_ctr - 1)))
                    this.setVector(this.pointsCtr[i][j].x, this.pointsCtr[i][j].y, this.pointsCtr[i][j].z,
                        this.m11PointsCtr[i][j].x, this.m11PointsCtr[i][j].y, this.m11PointsCtr[i][j].z,
                        "11", true, i, j);
            }

        this.add_vertices(N_ctr, M_ctr);

        this.createIndicesCtr(N_ctr, M_ctr);

        if (this.controlsParameters.coonsCubicSurface)
            this.calculateCoonsCubicSurface();

        this.setVertexBuffersAndDraw();
    },
    setLeftButtonDown: function (value) {
        this.leftButtonDown = value;
    },
    add_coords: function (i, j, x, y, z) {
        const pt = new Point(x, y, z);
        this.pointsCtr[i][j] = pt;
    },
    create_coord_tip: function (height, n, m) {
        const rBase = 0.25 * height;
        this.nLongitudes = 36;
        this.nLatitudes = 2;

		for (let p = 0; p < n; p++)
            for (let q = 0; q < m; q++) {

                if ((p == 0) || (p == n - 1)) {
                    const geometry = new THREE.ConeGeometry( rBase, height, this.nLongitudes, this.nLatitudes );
                    geometry.translate(0, -height/2, 0);
                    this.coneTips10[p][q] = new THREE.Mesh(geometry, this.materialConeTip );  
                    this.coneTips10[p][q].matrixAutoUpdate = false;
                }

                if ((q == 0) || (q == m - 1)) {
                    const geometry = new THREE.ConeGeometry( rBase, height, this.nLongitudes, this.nLatitudes );
                    geometry.translate(0, -height/2, 0);
                    this.coneTips01[p][q] = new THREE.Mesh(geometry, this.materialConeTip );  
                    this.coneTips01[p][q].matrixAutoUpdate = false;
                }

                if (((p == 0) || (p == n - 1)) && ((q == 0) || (q == m - 1))) {
                    const geometry = new THREE.ConeGeometry( rBase, height, this.nLongitudes, this.nLatitudes );
                    geometry.translate(0, -height/2, 0);
                    this.coneTips11[p][q] = new THREE.Mesh(geometry, this.materialConeTip );  
                    this.coneTips11[p][q].matrixAutoUpdate = false;
                }
            }
    },
    setVector: function (x1, y1, z1, x2, y2, z2, orient, create, i, j) {
        let pt;
        let ptm;
        let pointsVectorCtr;
        let coneTip;

        switch (orient) {
            case "10":
                pointsVectorCtr = this.pointsVector10Ctr;
                coneTip = this.coneTips10[i][j];
                break;
            case "01":
                pointsVectorCtr = this.pointsVector01Ctr;
                coneTip = this.coneTips01[i][j];
                break;
            case "11":
                pointsVectorCtr = this.pointsVector11Ctr;
                coneTip = this.coneTips11[i][j];
                break;
        }

        if (create) //create mode
        {
            pt = new Point(x1, y1, z1);
            ptm = new Point(x2, y2, z2);

            pointsVectorCtr[i][j][0] = pt;
            pointsVectorCtr[i][j][1] = ptm;
        }
        else //update mode
        {
            pointsVectorCtr[i][j][0].setPoint(x1, y1, z1);
            pointsVectorCtr[i][j][1].setPoint(x2, y2, z2);
        }

        const position = new THREE.Vector3( x2, y2, z2 );
        const quaternion = new THREE.Quaternion();
        const vFrom = new THREE.Vector3( 0, 1, 0 );
        const vTo = new THREE.Vector3( x2 - x1, y2 - y1, z2 - z1 );
        vTo.normalize();
        quaternion.setFromUnitVectors ( vFrom, vTo );

        coneTip.position.copy( position );
        coneTip.quaternion.copy( quaternion );
        coneTip.updateMatrix();

        if (!create) //update mode
            this.updateVerticesVectorCtr(orient, i, j)
    },
    setSelectVector: function (orient, select, i, j) {
        let pointsVectorCtr;

        switch (orient) {
            case "10":
                pointsVectorCtr = this.pointsVector10Ctr;
                break;
            case "01":
                pointsVectorCtr = this.pointsVector01Ctr;
                break;
            case "11":
                pointsVectorCtr = this.pointsVector11Ctr;
                break;
        }

        pointsVectorCtr[i][j][0].select = select;
        pointsVectorCtr[i][j][1].select = select;

        this.updateVerticesVectorCtr(orient, i, j);
    },
    updateVerticesVectorCtr: function (orient, i, j) {
        let pointsVectorCtr;
        let verticesVectorCtr;
        let colorsVectorCtr;
        let color;

        switch (orient) {
            case "10":
                pointsVectorCtr = this.pointsVector10Ctr;
                verticesVectorCtr = this.verticesVector10Ctr;
                colorsVectorCtr = this.colorsVector10Ctr;
                color = [1.0, 0.0, 1.0];
                break;
            case "01":
                pointsVectorCtr = this.pointsVector01Ctr;
                verticesVectorCtr = this.verticesVector01Ctr;
                colorsVectorCtr = this.colorsVector01Ctr;
                color = [0.0, 1.0, 1.0];
                break;
            case "11":
                pointsVectorCtr = this.pointsVector11Ctr;
                verticesVectorCtr = this.verticesVector11Ctr;
                colorsVectorCtr = this.colorsVector11Ctr;
                color = [0.5, 0.5, 0.5];
                break;
        }

        const number = i * this.controlsParameters.M_ctr + j;

        verticesVectorCtr[2 * number * 3] = pointsVectorCtr[i][j][0].x;
        verticesVectorCtr[2 * number * 3 + 1] = pointsVectorCtr[i][j][0].y;
        verticesVectorCtr[2 * number * 3 + 2] = pointsVectorCtr[i][j][0].z;
        if (pointsVectorCtr[i][j][0].select)
            colorsVectorCtr.set([0.5, 0.5, 0.0], 2 * number * 3);
        else
            colorsVectorCtr.set(color, 2 * number * 3);

        verticesVectorCtr[(2 * number + 1) * 3] = pointsVectorCtr[i][j][1].x;
        verticesVectorCtr[(2 * number + 1) * 3 + 1] = pointsVectorCtr[i][j][1].y;
        verticesVectorCtr[(2 * number + 1) * 3 + 2] = pointsVectorCtr[i][j][1].z;
        if (pointsVectorCtr[i][j][1].select)
            colorsVectorCtr.set([0.5, 0.5, 0.0], (2 * number + 1) * 3);
        else
            colorsVectorCtr.set(color, (2 * number + 1) * 3);
    },
    createIndicesCtr: function (n, m) {
        let i, j, k = 0;
        this.indicesCtr = new Array(2 * n * m);

        for (i = 0; i < n; i++)
            for (j = 0; j < m; j++)
                this.indicesCtr[k++] = i * m + j;
        for (j = 0; j < m; j++)
            for (i = 0; i < n; i++)
                this.indicesCtr[k++] = i * m + j;
			
		this.controlPoligons = new THREE.BufferGeometry();
		this.controlPoligons.setIndex( this.indicesCtr );
			
        this.controlPoligons.addGroup ( 0, m, 0 );
        this.controlPoligons.addGroup ( (n-1) * m, m, 0 );

        this.controlPoligons.addGroup ( n * m, n, 1 );
        this.controlPoligons.addGroup ( n * m + (m-1) * n, n, 1 );
				
		this.meshControlPoligons = new THREE.Line( this.controlPoligons, this.materialControlPoligons);
    },
    mousemoveHandler: function (x, y) {
        if (this.leftButtonDown) {
            if (this.movePoint || this.moveVector10 || this.moveVector01 || this.moveVector11) {
                const offset = this.iMove * this.controlsParameters.M_ctr + this.jMove;
				
				const vector = new THREE.Vector3();
				
				const width = window.innerWidth, height = window.innerHeight;
				const widthHalf = width / 2, heightHalf = height / 2;

				vector.x = ( x - widthHalf) / widthHalf;
				vector.y = -( y - heightHalf ) / heightHalf;
                if (this.movePoint)
                    vector.z = this.pointsCtr[this.iMove][this.jMove].winz;
                if (this.moveVector10)
                    vector.z = this.m10PointsCtr[this.iMove][this.jMove].winz;
                if (this.moveVector01)
                    vector.z = this.m01PointsCtr[this.iMove][this.jMove].winz;
                if (this.moveVector11)
                    vector.z = this.m11PointsCtr[this.iMove][this.jMove].winz;
				
				vector.unproject(this.camera);

                if (this.movePoint) {
                    this.pointsCtr[this.iMove][this.jMove].x = vector.x;
                    this.pointsCtr[this.iMove][this.jMove].y = vector.y;
                    this.pointsCtr[this.iMove][this.jMove].z = vector.z;
    
                    this.verticesCtr[offset * 3] = this.pointsCtr[this.iMove][this.jMove].x;
                    this.verticesCtr[offset * 3 + 1] = this.pointsCtr[this.iMove][this.jMove].y;
                    this.verticesCtr[offset * 3 + 2] = this.pointsCtr[this.iMove][this.jMove].z;

                    this.tPt.x = this.pointsCtr[this.iMove][this.jMove].x - this.OldPt.x;
                    this.tPt.y = this.pointsCtr[this.iMove][this.jMove].y - this.OldPt.y;
                    this.tPt.z = this.pointsCtr[this.iMove][this.jMove].z - this.OldPt.z;

                    this.m10PointsCtr[this.iMove][this.jMove].x = this.OldPtm10.x + this.tPt.x;
                    this.m10PointsCtr[this.iMove][this.jMove].y = this.OldPtm10.y + this.tPt.y;
                    this.m10PointsCtr[this.iMove][this.jMove].z = this.OldPtm10.z + this.tPt.z;

                    this.m01PointsCtr[this.iMove][this.jMove].x = this.OldPtm01.x + this.tPt.x;
                    this.m01PointsCtr[this.iMove][this.jMove].y = this.OldPtm01.y + this.tPt.y;
                    this.m01PointsCtr[this.iMove][this.jMove].z = this.OldPtm01.z + this.tPt.z;

                    this.m11PointsCtr[this.iMove][this.jMove].x = this.OldPtm11.x + this.tPt.x;
                    this.m11PointsCtr[this.iMove][this.jMove].y = this.OldPtm11.y + this.tPt.y;
                    this.m11PointsCtr[this.iMove][this.jMove].z = this.OldPtm11.z + this.tPt.z;

                    if ((this.iMove == 0) || (this.iMove == this.controlsParameters.N_ctr - 1))                    
                        this.setVector(this.pointsCtr[this.iMove][this.jMove].x,
                        this.pointsCtr[this.iMove][this.jMove].y,
                        this.pointsCtr[this.iMove][this.jMove].z,
                        this.m10PointsCtr[this.iMove][this.jMove].x,
                        this.m10PointsCtr[this.iMove][this.jMove].y,
                        this.m10PointsCtr[this.iMove][this.jMove].z, "10", false,
                        this.iMove, this.jMove);

                    if ((this.jMove == 0) || (this.jMove == this.controlsParameters.M_ctr - 1))
                        this.setVector(this.pointsCtr[this.iMove][this.jMove].x,
                            this.pointsCtr[this.iMove][this.jMove].y,
                            this.pointsCtr[this.iMove][this.jMove].z,
                            this.m01PointsCtr[this.iMove][this.jMove].x,
                            this.m01PointsCtr[this.iMove][this.jMove].y,
                            this.m01PointsCtr[this.iMove][this.jMove].z, "01", false,
                            this.iMove, this.jMove);

                    if (((this.iMove == 0) || (this.iMove == this.controlsParameters.N_ctr - 1)) && 
                        ((this.jMove == 0) || (this.jMove == this.controlsParameters.M_ctr - 1)))
                        this.setVector(this.pointsCtr[this.iMove][this.jMove].x,
                            this.pointsCtr[this.iMove][this.jMove].y,
                            this.pointsCtr[this.iMove][this.jMove].z,
                            this.m11PointsCtr[this.iMove][this.jMove].x,
                            this.m11PointsCtr[this.iMove][this.jMove].y,
                            this.m11PointsCtr[this.iMove][this.jMove].z, "11", false,
                            this.iMove, this.jMove);
                }
                else if (this.moveVector10) {
                    this.m10PointsCtr[this.iMove][this.jMove].x = vector.x;
                    this.m10PointsCtr[this.iMove][this.jMove].y = vector.y;
                    this.m10PointsCtr[this.iMove][this.jMove].z = vector.z;

                    this.setVector(this.pointsCtr[this.iMove][this.jMove].x,
                        this.pointsCtr[this.iMove][this.jMove].y,
                        this.pointsCtr[this.iMove][this.jMove].z,
                        this.m10PointsCtr[this.iMove][this.jMove].x,
                        this.m10PointsCtr[this.iMove][this.jMove].y,
                        this.m10PointsCtr[this.iMove][this.jMove].z, "10", false,
                        this.iMove, this.jMove);
                }
                else if (this.moveVector01) {
                    this.m01PointsCtr[this.iMove][this.jMove].x = vector.x;
                    this.m01PointsCtr[this.iMove][this.jMove].y = vector.y;
                    this.m01PointsCtr[this.iMove][this.jMove].z = vector.z;

                    this.setVector(this.pointsCtr[this.iMove][this.jMove].x,
                        this.pointsCtr[this.iMove][this.jMove].y,
                        this.pointsCtr[this.iMove][this.jMove].z,
                        this.m01PointsCtr[this.iMove][this.jMove].x,
                        this.m01PointsCtr[this.iMove][this.jMove].y,
                        this.m01PointsCtr[this.iMove][this.jMove].z, "01", false,
                        this.iMove, this.jMove);
                }
                else if (this.moveVector11) {
                    this.m11PointsCtr[this.iMove][this.jMove].x = vector.x;
                    this.m11PointsCtr[this.iMove][this.jMove].y = vector.y;
                    this.m11PointsCtr[this.iMove][this.jMove].z = vector.z;

                    this.setVector(this.pointsCtr[this.iMove][this.jMove].x,
                        this.pointsCtr[this.iMove][this.jMove].y,
                        this.pointsCtr[this.iMove][this.jMove].z,
                        this.m11PointsCtr[this.iMove][this.jMove].x,
                        this.m11PointsCtr[this.iMove][this.jMove].y,
                        this.m11PointsCtr[this.iMove][this.jMove].z, "11", false,
                        this.iMove, this.jMove);
                }

                if (this.controlsParameters.coonsCubicSurface)
                    this.calculateCoonsCubicSurface();
            }
            this.setVertexBuffersAndDraw();
        }
        else {
			this.trackballControls.enabled = true;
            for (let i = 0; i < this.controlsParameters.N_ctr; i++)
                for (let j = 0; j < this.controlsParameters.M_ctr; j++) {

                    if ((i > 0) && (i < this.controlsParameters.N_ctr-1) && (j > 0) && (j < this.controlsParameters.M_ctr-1))
                        continue;

                    this.pointsCtr[i][j].select = false;
					this.pointsCtr[i][j].calculateWindowCoordinates(this.camera);
                    if ((i == 0) || (i == this.controlsParameters.N_ctr - 1))
                        this.m10PointsCtr[i][j].calculateWindowCoordinates(this.camera);
                    if ((j == 0) || (j == this.controlsParameters.M_ctr - 1))
                        this.m01PointsCtr[i][j].calculateWindowCoordinates(this.camera);
                    if (((i == 0) || (i == this.controlsParameters.N_ctr - 1)) && ((j == 0) || (j == this.controlsParameters.M_ctr - 1)))
                        this.m11PointsCtr[i][j].calculateWindowCoordinates(this.camera);

                    if (this.pointsCtr[i][j].ptInRect(x, y)) {
                        this.pointsCtr[i][j].select = true;
						this.trackballControls.enabled = false;
					}

                    this.m10PointsCtr[i][j].select = false;
                    if ((i == 0) || (i == this.controlsParameters.N_ctr - 1)) {
                        this.coneTips10[i][j].material = this.materialConeTip;

                        if (this.m10PointsCtr[i][j].ptInRect(x, y)) {
                            this.m10PointsCtr[i][j].select = true;
                            this.coneTips10[i][j].material = this.materialConeTipSelect;
                            this.trackballControls.enabled = false;
                        }
                    }

                    this.m01PointsCtr[i][j].select = false;
                    if ((j == 0) || (j == this.controlsParameters.M_ctr - 1)) {
                        this.coneTips01[i][j].material = this.materialConeTip;

                        if (this.m01PointsCtr[i][j].ptInRect(x, y)) {
                            this.m01PointsCtr[i][j].select = true;
                            this.coneTips01[i][j].material = this.materialConeTipSelect;
                            this.trackballControls.enabled = false;
                        }
                    }

                    this.m11PointsCtr[i][j].select = false;
                    if (((i == 0) || (i == this.controlsParameters.N_ctr - 1)) && ((j == 0) || (j == this.controlsParameters.M_ctr - 1))) {
                            this.coneTips11[i][j].material = this.materialConeTip;

                            if (this.m11PointsCtr[i][j].ptInRect(x, y)) {
                                this.m11PointsCtr[i][j].select = true;
                                this.coneTips11[i][j].material = this.materialConeTipSelect;
                                this.trackballControls.enabled = false;
                            }
                    }

                    if ((i == 0) || (i == this.controlsParameters.N_ctr - 1))
                        this.setSelectVector("10", this.m10PointsCtr[i][j].select, i, j)
                    if ((j == 0) || (j == this.controlsParameters.M_ctr - 1))
                        this.setSelectVector("01", this.m01PointsCtr[i][j].select, i, j)
                    if (((i == 0) || (i == this.controlsParameters.N_ctr - 1)) && ((j == 0) || (j == this.controlsParameters.M_ctr - 1)))
                        this.setSelectVector("11", this.m11PointsCtr[i][j].select, i, j)
                }
                this.setVertexBuffersAndDraw();
		}
    },
    mousedownHandler: function (button, x, y) {
        if (button == 0) { //left button
			this.movePoint = false;
            this.moveVector10 = false;
            this.moveVector01 = false;
            this.moveVector11 = false;

			for (let i = 0; i < this.controlsParameters.N_ctr; i++)
				for (let j = 0; j < this.controlsParameters.M_ctr; j++) {

                    if ((i > 0) && (i < this.controlsParameters.N_ctr-1) && (j > 0) && (j < this.controlsParameters.M_ctr-1))
                        continue;

					if (this.pointsCtr[i][j].select == true) {
						this.movePoint = true;
						this.iMove = i;
						this.jMove = j;

                        this.OldPt.setPoint(this.pointsCtr[i][j].x, this.pointsCtr[i][j].y, this.pointsCtr[i][j].z);
                        this.OldPtm10.setPoint(this.m10PointsCtr[i][j].x, this.m10PointsCtr[i][j].y, this.m10PointsCtr[i][j].z);
                        this.OldPtm01.setPoint(this.m01PointsCtr[i][j].x, this.m01PointsCtr[i][j].y, this.m01PointsCtr[i][j].z);
                        this.OldPtm11.setPoint(this.m11PointsCtr[i][j].x, this.m11PointsCtr[i][j].y, this.m11PointsCtr[i][j].z);
					}
                    if (this.m10PointsCtr[i][j].select == true) {
                        this.moveVector10 = true;
                        this.iMove = i;
                        this.jMove = j;
                    }
                    if (this.m01PointsCtr[i][j].select == true) {
                        this.moveVector01 = true;
                        this.iMove = i;
                        this.jMove = j;
                    }
                    if (this.m11PointsCtr[i][j].select == true) {
                        this.moveVector11 = true;
                        this.iMove = i;
                        this.jMove = j;
                    }
				}

			if (!this.movePoint && !this.moveVector10 && !this.moveVector01 && !this.moveVector11) {
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
    add_vertices: function (n, m) {
        const totalLength = n * m;
		
        this.verticesCtr = new Float32Array(totalLength * 3);
        this.verticesVector10Ctr = new Float32Array(2 * totalLength * 3);
        this.verticesVector01Ctr = new Float32Array(2 * totalLength * 3);
        this.verticesVector11Ctr = new Float32Array(2 * totalLength * 3);
        this.colorsVector10Ctr = new Float32Array(2 * totalLength * 3);
        this.colorsVector01Ctr = new Float32Array(2 * totalLength * 3);
        this.colorsVector11Ctr = new Float32Array(2 * totalLength * 3);
        for (let i = 0; i < n; i++)
            for (let j = 0; j < m; j++) {

                if ((i > 0) && (i < n-1) && (j > 0) && (j < m-1))
                    continue;

                const offset = i * m + j;
                this.verticesCtr[offset * 3] = this.pointsCtr[i][j].x;
                this.verticesCtr[offset * 3 + 1] = this.pointsCtr[i][j].y;
                this.verticesCtr[offset * 3 + 2] = this.pointsCtr[i][j].z;

                if ((i == 0) || (i == n-1))
                    this.updateVerticesVectorCtr("10", i, j);
                if ((j == 0) || (j == m-1))
                    this.updateVerticesVectorCtr("01", i, j);
                if (((i == 0) || (i == n-1)) && ((j == 0) || (j == m-1)))
                    this.updateVerticesVectorCtr("11", i, j);
            }
    },
    setVertexBuffersAndDraw: function () {
        // Clear scene
		this.scene.remove.apply(this.scene, this.scene.children);
		
		if (this.controlsParameters.showAxes)		
			this.scene.add(this.axes);

        // Draw
        if (this.controlsParameters.showCtrPoints)
			for (let i = 0; i < this.controlsParameters.N_ctr; i++)
				for (let j = 0; j < this.controlsParameters.M_ctr; j++) {

                    if ((i > 0) && (i < this.controlsParameters.N_ctr-1) && (j > 0) && (j < this.controlsParameters.M_ctr-1))
                        continue;

					if (this.pointsCtr[i][j].select)
						this.spritesCtr[i][j] = new THREE.Sprite(this.materialSelectedSpritesCtr);
					else
						this.spritesCtr[i][j] = new THREE.Sprite(this.materialSpritesCtr);
					this.spritesCtr[i][j].position.set(this.pointsCtr[i][j].x, this.pointsCtr[i][j].y, this.pointsCtr[i][j].z);
					this.spritesCtr[i][j].scale.set(0.2, 0.2);
					this.scene.add(this.spritesCtr[i][j]);
				}
        if (this.controlsParameters.controlNet) {
			this.meshControlPoligons.geometry.setAttribute( 'position', new THREE.BufferAttribute( this.verticesCtr, 3 ) );
			this.scene.add(this.meshControlPoligons);
        }

        if (this.controlsParameters.showCtrPoints) {

	        for (let i = 0; i < 3; i++) {
                const lineGeometry = new THREE.BufferGeometry();

                switch (i) {
                    case 0:
                        lineGeometry.setAttribute( 'position', new THREE.BufferAttribute( this.verticesVector10Ctr, 3 ) );
                        lineGeometry.setAttribute('color', new THREE.BufferAttribute(this.colorsVector10Ctr, 3));
                        break;
                    case 1:
                        lineGeometry.setAttribute( 'position', new THREE.BufferAttribute( this.verticesVector01Ctr, 3 ) );
                        lineGeometry.setAttribute('color', new THREE.BufferAttribute(this.colorsVector01Ctr, 3));
                        break;
                    case 2:
                        lineGeometry.setAttribute( 'position', new THREE.BufferAttribute( this.verticesVector11Ctr, 3 ) );
                        lineGeometry.setAttribute('color', new THREE.BufferAttribute(this.colorsVector11Ctr, 3));
                        break;                   
                }

                const materialLine = new THREE.LineBasicMaterial({ vertexColors: true } );
	
                // Create the line
                const meshLine = new THREE.LineSegments( lineGeometry, materialLine );
                this.scene.add(meshLine);

                for (let p = 0; p < this.controlsParameters.N_ctr; p++)
                    for (let q = 0; q < this.controlsParameters.M_ctr; q++) {
        
                        if ((p == 0) || (p == this.controlsParameters.N_ctr - 1)) {
                            this.scene.add( this.coneTips10[p][q] );        
                        }
        
                        if ((q == 0) || (q == this.controlsParameters.M_ctr - 1)) {
                            this.scene.add( this.coneTips01[p][q] );   
                        }
        
                        if (((p == 0) || (p == this.controlsParameters.N_ctr - 1)) && ((q == 0) || (q == this.controlsParameters.M_ctr - 1))) {
                            this.scene.add( this.coneTips11[p][q] );   
                        }
                    }
            }            
        }

        if (this.controlsParameters.coonsCubicSurface) {
			switch (this.controlsParameters.visualize) {
			case "solid":
				this.meshSplineSurface = new THREE.Mesh(this.geometrySplineSurface, this.materialSolidSplineSurface);
				this.scene.add(this.meshSplineSurface);
				initDefaultLighting(this.scene, this.camera.position);
				break;
			case "wireframe":
				this.meshSplineSurface = new THREE.Mesh(this.geometrySplineSurface, this.materialWireframeSplineSurface);
				this.scene.add(this.meshSplineSurface);
				break;
			}
        }
    },
	calculateAndDraw: function () {
		if (this.controlsParameters.coonsCubicSurface)
			this.calculateCoonsCubicSurface();
        
        this.setVertexBuffersAndDraw();
    },
    calculateCoonsCubicSurface: function () {

        let i, j;

        const N_ctr = this.controlsParameters.N_ctr;
        const M_ctr = this.controlsParameters.M_ctr;

        // INITIALIZE PARAMETRIC COORDINATES
        // for (i = 0; i < N_ctr; i++) 
        // {
        	// for (j = 0; j < M_ctr; j++)
        	// {
                // if ((i > 0) && (i < N_ctr-1) && (j > 0) && (j < M_ctr-1))
                //     continue;
				// switch (this.controlsParameters.paramCoords) {
				// case "uniform":
					// this.pointsCtr[i][j].u = u;
					// this.pointsCtr[i][j].v = v;
					// break;
				// case "chordal":
					// this.pointsCtr[i][j].u = u;
					// this.pointsCtr[i][j].v = v;
					// break;
				// case "centripetal":
					// this.pointsCtr[i][j].u = u;
					// this.pointsCtr[i][j].v = v;
					// break;
				// }
        	// }
        // }
		
		const coonsCubicSurface = (pointsCtr, N_ctr, M_ctr) => {
			return function ( u, v, target ) {
				// CALCULATE SURFACE COORDINATES
				const x = u;
				const y = v;
				const z = u+v;

				target.set( x, y, z );
			}
		};
		this.geometrySplineSurface = new ParametricGeometry(	coonsCubicSurface(this.pointsCtr, N_ctr, M_ctr), 
																this.controlsParameters.slices, 
																this.controlsParameters.stacks);
    }
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

window.onload = main;