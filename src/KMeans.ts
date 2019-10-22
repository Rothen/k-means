import { Cluster } from './type/Cluster';
import { Metric } from './metric/Metric';
import { CentroidCalculator } from './centroid_calculator/CentroidCalculator';
import { EuclidianDistance } from './metric/EuclidianDistance';
import { MeanCentroidCalculator } from './centroid_calculator/MeanCentroidCalculator';
import { Vector } from './type/Vector';
import { Matrix } from './type/Matrix';
import { Result } from './type/Result';
import { Options } from './type/Options';

export class KMeans {
    private _vectors: Vector[] | Matrix = [];
    private _clusters: Cluster[] = [];
    private _meanSquaredError: number;
    private options: Options = {
        metric: new EuclidianDistance(),
        centroidCalculator: new MeanCentroidCalculator(),
        clusterCount: 0,
        maxIterations: 100,
        centroids: null
    };

    constructor(options: Options = {}) {
        this.options = { ...this.options, ...options };
        this.generateStartingClusters();
    }

    public fit(vectors: Vector[] | Matrix): Result {
        this.prepareIteration(vectors);
        const iterations = this.iterate();
        this.calculateMeanSquaredError();

        return {
            clusters: this.clusters,
            iterations: iterations,
            meanSquaredError: this.meanSquaredError
        };
    }

    public predict(vectors: Vector[] | Matrix): number[] {
        let result: number[] = [];

        for (const vector of vectors) {
            const nearestCluster = this.getNearestCluster(vector);
            result.push(this.clusters.indexOf(nearestCluster));
        }

        return result;
    }

    private prepareIteration(vectors: Vector[] | Matrix): void {
        this._vectors = vectors;
        this._clusters = [];
        this.kMeansPlusPlus();
    }

    private iterate(): number {
        let centroidsHaveChanged = true;
        let iterations = 0;

        while (iterations < this.maxIterations && centroidsHaveChanged) {
            this.next();
            iterations++;
            centroidsHaveChanged = this.centroidsHaveChanged();
        }

        return iterations;
    }

    private generateStartingClusters() {
        if (this.centroids) {
            if (this.centroids.length !== this.clusterCount) {
                throw new Error('Number of centroids must equal k');
            }

            this.generateStartingClustersByGivenCentroids();
        } else {
            this.generateStartingClustersByRandomCentroids();
        }
    }

    private kMeansPlusPlus() {
        let mean = this.vectors[Math.round(Math.random() * this.vectors.length - 1)];
        let newCluster = new Cluster();
        newCluster.centroid = mean;
        this.clusters.push(newCluster);

        for (let i = 1; i < this.clusterCount; i++) {
            let res: Vector;
            let high = -Infinity;

            for (const vector of this.vectors) {
                const nearest = this.getNearestCluster(vector);
                let dist = this.metric.calculate(vector, nearest.centroid);

                if (dist > high) {
                    res = vector;
                    high = dist;
                }
            }

            newCluster = new Cluster();
            newCluster.centroid = res;
            this.clusters.push(newCluster);
        }
    }

    private generateStartingClustersByGivenCentroids() {
        for (let i = 0; i < this.clusterCount; i++) {
            const cluster = new Cluster();

            cluster.centroid = this.centroids[i];
            this.clusters.push(cluster);
        }
    }

    private generateStartingClustersByRandomCentroids() {
        for (let i = 0; i < this.clusterCount; i++) {
            const cluster = new Cluster();
            const index = Math.round(Math.random() * this.vectors.length - 1);
            const centroid = this.vectors[index];

            cluster.initCentroid(centroid);
            this.clusters.push(cluster);
        }
    }

    private calculateMeanSquaredError() {
        this._meanSquaredError = 0;

        for (const cluster of this.clusters) {
            for (const vector of cluster.vectors) {
                const distance = this.metric.calculate(vector, cluster.centroid);
                this._meanSquaredError += distance;
            }
        }

        this._meanSquaredError /= this.vectors.length;
    }

    private centroidsHaveChanged(): boolean {
        let centroidsHaveChanged = false;

        for (const cluster of this.clusters) {
            centroidsHaveChanged = centroidsHaveChanged || cluster.centroidHasChanged();
        }

        return centroidsHaveChanged;
    }

    private next(): void {
        for (const cluster of this.clusters) {
            cluster.reset();
        }

        for (const vector of this.vectors) {
            const nearestCluster = this.getNearestCluster(vector);
            nearestCluster.addVector(vector);
        }

        for (const cluster of this.clusters) {
            const newCentroid = this.centroidCalculator.calculate(cluster.vectors);
            cluster.centroid = newCentroid;
        }
    }

    private getNearestCluster(vector: Vector): Cluster {
        let currentCluster = this.clusters[0];

        for (let i = 1; i < this.clusters.length; i++) {
            const cluster = this.clusters[i];
            const newDistance = this.metric.calculate(vector, cluster.centroid);
            const currentDistance = this.metric.calculate(vector, currentCluster.centroid);

            if (newDistance <= currentDistance) {
                currentCluster = cluster;
            }
        }

        return currentCluster;
    }

    get vectors(): Vector[] | Matrix {
        return this._vectors;
    }

    get clusters(): Cluster[] {
        return this._clusters;
    }

    get meanSquaredError(): number {
        return this._meanSquaredError;
    }

    get metric(): Metric {
        return this.options.metric;
    }

    set metric(metric: Metric) {
        this.options.metric = metric;
    }

    get centroidCalculator(): CentroidCalculator {
        return this.options.centroidCalculator;
    }

    set centroidCalculator(centroidCalculator: CentroidCalculator) {
        this.options.centroidCalculator = centroidCalculator;
    }

    get clusterCount(): number {
        return this.options.clusterCount;
    }

    set clusterCount(clusterCount: number) {
        this.options.clusterCount = clusterCount;
    }

    get maxIterations(): number {
        return this.options.maxIterations;
    }

    set maxIterations(maxIterations: number) {
        this.options.maxIterations = maxIterations;
    }

    get centroids(): Vector[] | Matrix {
        return this.options.centroids;
    }

    set centroids(centroids: Vector[] | Matrix) {
        this.options.centroids = centroids;
    }
}
