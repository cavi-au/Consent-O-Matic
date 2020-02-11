class CaviDraggable {
    constructor(html, options) {
        this.html = html;

        let defaultOptions =  {
            activeClass: "droppable-active",
            hoverClass: "droppable-hover",
            cloneClass: null,
            preventDefaultEvents: ["move"],
            cloneParent: document.body,
            centerClone: true,
            dragMinDistance: 0
        };

        this.options = Object.assign({}, defaultOptions, options);

        let self = this;

        this.mouseDownListener = (evt)=>{
            if(evt.button === 0 && evt.target.matches(":not(input)") && evt.target.matches(":not(select)")) {
                self.startX = evt.pageX;
                self.startY = evt.pageY;
                self.mouseDown = true;
                evt.stopPropagation();
                evt.preventDefault();
            }
        };

        this.html.addEventListener("mousedown", this.mouseDownListener);

        this.mouseMoveListener = (evt)=>{
            if(self.mouseDown) {
                if(!self.dragging) {
                    let dragDistance = Math.sqrt(Math.pow(self.startX - evt.pageX, 2) + Math.pow(self.startY - evt.pageY, 2));
                    if(dragDistance > self.minDragDistance) {
                        self.dragging = true;
                        self.dragStart(evt);
                        self.drag(evt);
                    }
                } else {
                    self.drag(evt);
                }
            }
        };

        document.addEventListener("mousemove", this.mouseMoveListener);

        this.mouseUpListener = (evt)=>{
            if(evt.button === 0) {
                self.mouseDown = false;
            }

            if(!self.dragging || evt.button !== 0) {
                return;
            }
            self.dragStop(evt);
        };

        document.addEventListener("mouseup", this.mouseUpListener);

        this.clone = null;
        this.droppables = null;
        this.currentDroppable = null;
        this.currentHoverElement = null;
        this.dragging = false;
        this.mouseDown = false;
        this.minDragDistance = 10;
        this.startX = -1;
        this.startY = -1;
        
        this.lastScrollX = window.scrollX;
        this.lastScrollY = window.scrollY;

        this.scrollListener = (evt)=>{

            let deltaScrollX = window.scrollX - self.lastScrollX;
            let deltaScrollY = window.scrollY - self.lastScrollY;

            if(self.clone != null) {
                self.updateClonePos(self.lastX+deltaScrollX, self.lastY+deltaScrollY);
            }
            
            self.lastScrollX = window.scrollX;
            self.lastScrollY = window.scrollY;
        };

        window.addEventListener("scroll", this.scrollListener);
    }

    destroy() {
        document.removeEventListener("mousemove", this.mouseMoveListener);
        document.removeEventListener("mouseup", this.mouseUpListener);
        window.removeEventListener("scroll", this.scrollListener);
        this.html.removeEventListener("mousedown", this.mouseDownListener)
    }

    dragStart(evt) {
        let self = this;

        this.dragging = true;

        function isDescendant(parent, child) {
            var node = child.parentNode;
            while (node != null) {
                if (node == parent) {
                    return true;
                }
                node = node.parentNode;
            }
            return false;
       }

        if(typeof this.options.onStart === "function") {
            this.options.onStart();
        }

        this.html.style.pointerEvents = "none";

        this.droppables = Array.from(document.querySelectorAll(this.options.dropSelector)).filter((droppable)=>{
            if(droppable === self.html) {
                return false;
            }

            if(isDescendant(self.html, droppable)) {
                return false;
            }

            return true;
        });

        if(this.options.clone != null) {
            this.clone = this.options.clone;
        } else {
            this.clone = this.html.cloneNode(true);
        }
        
        if(this.options.cloneClass != null) {
            this.clone.classList.add(this.options.cloneClass);
        }

        this.clone.style.position = "absolute";
        this.clone.style.pointerEvents = "none";
        this.clone.style.zIndex = 2000;

        if(this.options.opacity != null) {
            this.clone.style.opacity = this.options.opacity;
        }

        this.options.cloneParent.appendChild(this.clone);
        let bounds = this.clone.getBoundingClientRect();

        this.offset = {
            x: 0,
            y: 0
        };

        if(this.options.centerClone) {
            this.offset.x -= (-bounds.width/2);
            this.offset.y -= (-bounds.height/2);
        }

        this.droppables.forEach((droppable)=>{
            droppable.classList.add(this.options.activeClass);
        });
    }
    updateClonePos(x, y) {
        this.lastX = x;
        this.lastY = y;
        this.clone.style.transform = "translate3d("+(x)+"px, "+(y)+"px, 0px)";
    }
    drag(evt) {
        if(!this.dragging) {
            return;
        }

        let x = evt.pageX-this.offset.x;
        let y = evt.pageY-this.offset.y;
        
        this.updateClonePos(x, y);
        
        let hoverElm = document.elementFromPoint(evt.clientX, evt.clientY);
        this.currentHoverElement = hoverElm;

        if(hoverElm != null) {
            let droppable = hoverElm;
            
            if(!droppable.matches("."+this.options.activeClass)) {
                droppable = droppable.closest("."+this.options.activeClass);
            }

            if(droppable != null) {
                if(this.currentDroppable === null || this.currentDroppable !== droppable) {
                    if(this.currentDroppable !== null) {
                        this.currentDroppable.classList.remove(this.options.hoverClass);
                    }
                    droppable.classList.add(this.options.hoverClass);
                    this.currentDroppable = droppable;
                }
            } else {
                if(this.currentDroppable !== null) {
                    this.currentDroppable.classList.remove(this.options.hoverClass);
                    this.currentDroppable = null;
                }
            }
        }
    }
    dragStop(evt) {
        let self = this;

        let dropTarget = this.currentDroppable;

        this.droppables.forEach((droppable)=>{
            droppable.classList.remove(this.options.activeClass);
            droppable.classList.remove(this.options.hoverClass);
        });

        this.html.style.pointerEvents = "";

        if(dropTarget !== null && typeof this.options.onDrop === "function") {
            this.options.onDrop(this.html, dropTarget, this.currentHoverElement);
        }
        
        this.clone.parentNode.removeChild(this.clone);
        this.clone = null;
        this.droppables = null;
        this.currentDroppable = null;
        this.currentHoverElement = null;

        setTimeout(()=>{
            self.dragging = false;
        }, 0);

        if(typeof this.options.onStop === "function") {
            this.options.onStop();
        }
    }
}
