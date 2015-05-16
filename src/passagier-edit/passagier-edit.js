export class PassagierEditController {
 
    constructor($http, $log, baseUrl, $routeParams) {
        this.$http = $http;
        this.$log = $log;
        //this.$scope = $scope;
        this.baseUrl = baseUrl;
        
        this.exitWarning = {
            show: false  
        }
        
        this.load($routeParams.id);
    }

    canActivate() {
        this.$log.info("canActivate"); 
        return true;
    }
    
    activate($scope) {
        this.$scope = $scope;
        this.$log.info("activate");    
        return true;
    }
    
    canDeactivate($q) {
        
        this.$log.info("canDeactivate");    
        if (!this.$scope.form.$dirty) return true;

        this.exitWarning.show = true;
        
        return $q((resolve, reject) => {
            this.exitWarning.resolve = resolve;
            this.exitWarning.reject = reject;
        }).finally(() => { 
            this.exitWarning.show = false;
        });
        
    }
    
    deactivate() {
        this.$log.info("deactivate");   
        return true;
    }
    
    load(id) {
        var that = this;

        var params = {};
        params.pNummer = id;

        this.$http
            .get(that.baseUrl + "/api/passagier", { params: params })
            .then((result) => {

                that.passagier = result.data;

            }).catch((p) => {
            
                that.message = "Beim Laden der Daten ist ein Fehler aufgetreten";
                that.$log.error("Fehler beim Laden von Passagieren");
                that.$log.error(p.data.message);
                that.$log.error(p.data.status);
            
            });
    }

    save() {
        var that = this;

        this
            .$http
            .post(that.baseUrl + "/api/passagier", this.passagier)
            .then((result) => {
                that.message = "Passagier wurde gespeichert!";
                that.$scope.form.$setDirty(false);
            })
            .catch((p) => {
                that.message = "Beim Speichern der Daten ist ein Fehler aufgetreten: "  + p.data;

                that.$log.error("Fehler beim Speichern von Passagieren: ");
                that.$log.error(p.data);
                that.$log.error(p.status);

            });

    }

    clearMessage() {
        this.message = null;
    }

}