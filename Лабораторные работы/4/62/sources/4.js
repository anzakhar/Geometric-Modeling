// 4.js

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
    let camera = new THREE.OrthographicCamera( window.innerWidth / -800, window.innerWidth / 800, window.innerHeight / 800,
                    window.innerHeight / -800, -200, 500 );
					
	// add the output of the renderer to the html element
    document.body.appendChild(renderer.domElement);
	
	const trackballControls = initTrackballControls(camera, renderer);

    Data.init(scene, camera, trackballControls);

	gui.add(Data.controlsParameters, 'showAxes').onChange(function (e) { Data.setVertexBuffersAndDraw(); });
	
	const guiSurfaceParams = gui.addFolder('Ruled surface parameters');
	
	
	guiSurfaceParams.add(Data.controlsParameters, 'ruledSurface').onChange(function (e) { Data.calculateAndDraw(); });
	guiSurfaceParams.add(Data.controlsParameters, 'visualize', ["wireframe", "solid"]);
	guiSurfaceParams.add(Data.controlsParameters, 'slices', 2, 1000, 1).onChange(function (e) { Data.calculateAndDraw(); });
	guiSurfaceParams.add(Data.controlsParameters, 'stacks', 2, 10, 1).onChange(function (e) { Data.calculateAndDraw(); });

    Data.generateBoundaryCurves(Data.controlsParameters.slices);
					
	camera.position.set(0, 0, 30);
		
	renderScene();

    function renderScene() {
		trackballControls.update(clock.getDelta());
        // render using requestAnimationFrame
        requestAnimationFrame(renderScene);
		Data.setVertexBuffersAndDraw();
        renderer.render(scene, camera);
    }
}

class Point {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

const Curves = {
	yt: function(x, t) {
        // https://en.wikipedia.org/wiki/NACA_airfoil
        return 5*t*(0.2969*Math.sqrt(x) - 0.1260*x - 0.3516*(x**2) + 0.2843*(x**3) - 0.1015*(x**4));
    },
    yt_x: function(x, t) {	
        return 5*t*(0.2969*0.5*(x ** (-0.5)) - 0.1260 - 0.3516*2*x + 0.2843*3*(x**2) - 0.1015*4*(x**3));
    },
    c1: function (u, pt) {
        const t = 0.15;
        let x, y;
        if (u < 0.5) {
            x = 2*u;
            y = this.yt(x, t);
        }
        else {
            x = 2*(1-u);
            y = -this.yt(x, t);
        }

        pt.x = x - 0.5;
        pt.y = y;
        pt.z = 0.5;
    },
    c2: function (u, pt) {
        const t = 0.3;
        let x, y;
        if (u < 0.5) {
            x = 2*u;
            y = this.yt(x, t);
        }
        else {
            x = 2*(1-u);
            y = -this.yt(x, t);
        }

        pt.x = x - 0.5;
        pt.y = y;
        pt.z = -0.5;
    },
}

const Data = {
    scene: null,
    verticesC1: {},
    verticesC2: {},
	materialCurve: null,
	materialWireframeRuledSurface: null,
	materialSolidRuledSurface: null,
	geometryRuledSurface: null,
	meshC1: null,
	meshC2: null,
	meshRuledSurface: null,
	ambientLight: null,
	pointLight: null,
	camera: null,
	trackballControls: null,
	axes: null,

  	controlsParameters: {
		showAxes: true,
		ruledSurface: false,
		visualize: "wireframe",
		slices: 500,
		stacks: 2
	},
    init: function (scene, camera, trackballControls) {
        this.scene = scene;
		this.camera = camera;
		this.trackballControls = trackballControls;

        this.N_ctr = this.controlsParameters.N_ctr;
        this.M_ctr = this.controlsParameters.M_ctr;
		
		this.materialCurve = new THREE.LineBasicMaterial({ color: 0x000000 });
		this.materialSolidRuledSurface = new THREE.MeshPhongMaterial({color: 'rgb(50%,50%,50%)', specular: 'rgb(50%,50%,50%)', shininess: 51, side: THREE.DoubleSide});
		this.materialWireframeRuledSurface = new THREE.MeshBasicMaterial({ color: 'rgb(50%,50%,50%)', wireframe: true });
		// show axes in the screen
		this.axes = new THREE.AxesHelper(0.5);
		
		const pointColor = "#ffffff";
		this.pointLight = new THREE.PointLight(pointColor);
		this.pointLight.position.copy(this.camera.position);
		const ambientColor = 'rgb(20%,20%,20%)';
		this.ambientLight = new THREE.AmbientLight(ambientColor);
    },
    generateBoundaryCurves: function (n) {

        this.verticesC1 = new Float32Array(3 * n);
        this.verticesC2 = new Float32Array(3 * n);

        const pt = new Point();

        for (let i = 0; i < n; i++)
        {
            const t = i / (n - 1);

            Curves.c1(t, pt);
            this.verticesC1[i * 3]     = pt.x;
            this.verticesC1[i * 3 + 1] = pt.y;
            this.verticesC1[i * 3 + 2] = pt.z;

            Curves.c2(t, pt);
            this.verticesC2[i * 3] = pt.x;
            this.verticesC2[i * 3 + 1] = pt.y;
            this.verticesC2[i * 3 + 2] = pt.z;
        }
		
		const curve1 = new THREE.BufferGeometry();
		const curve2 = new THREE.BufferGeometry();
		curve1.setAttribute( 'position', new THREE.BufferAttribute( this.verticesC1, 3 ) );
		curve2.setAttribute( 'position', new THREE.BufferAttribute( this.verticesC2, 3 ) );

		this.meshC1 = new THREE.Line( curve1, this.materialCurve);
		this.meshC2 = new THREE.Line( curve2, this.materialCurve);

        if (this.controlsParameters.ruledSurface)
            this.calculateRuledSurface();

        this.setVertexBuffersAndDraw();
    },
    setVertexBuffersAndDraw: function () {
        // Clear scene
		this.scene.remove.apply(this.scene, this.scene.children);
		
		if (this.controlsParameters.showAxes)		
			this.scene.add(this.axes);

        // Draw
		this.scene.add(this.meshC1);
		this.scene.add(this.meshC2);
        if (this.controlsParameters.ruledSurface) {
			switch (this.controlsParameters.visualize) {
			case "solid":
				this.meshRuledSurface = new THREE.Mesh(this.geometryRuledSurface, this.materialSolidRuledSurface);
				this.scene.add(this.meshRuledSurface);
				initDefaultLighting(this.scene, this.camera.position);
				break;
			case "wireframe":
				this.meshRuledSurface = new THREE.Mesh(this.geometryRuledSurface, this.materialWireframeRuledSurface);
				this.scene.add(this.meshRuledSurface);
				break;
			}
        }
    },
		calculateAndDraw: function () {
		if (this.controlsParameters.ruledSurface)
			this.calculateRuledSurface();
        
        this.setVertexBuffersAndDraw();
    },
    calculateRuledSurface: function(){
		const ruledSurface = () => {
			return function ( u, v, target ) {
				const pt1 = new Point();
				const pt2 = new Point();

				//// ДОБАВИТЬ КОД РАСЧЕТА ТОЧЕК ЛИНЕЙЧАТОЙ ПОВЕРХНОСТИ
				// Curves.c1(u, pt1);
				// Curves.c2(u, pt2);

				const x = u;
				const y = v;
				const z = u+v;
		
				target.set( x, y, z );
			}
		};
		this.geometryRuledSurface = new THREE.ParametricGeometry(	ruledSurface(), 
																	this.controlsParameters.slices, 
																	this.controlsParameters.stacks);
    }
}