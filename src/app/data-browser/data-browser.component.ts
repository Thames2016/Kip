import { Component, OnInit, AfterViewInit, ViewChild,ChangeDetectorRef, OnDestroy} from '@angular/core';
import { Subscription } from 'rxjs';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';

import { SignalKDataService } from '../core/services/signalk-data.service';
import { IPathData } from "../core/interfaces/app-interfaces";
import { DataBrowserRowComponent } from '../data-browser-row/data-browser-row.component';
import { NgFor, KeyValuePipe } from '@angular/common';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel } from '@angular/material/form-field';


@Component({
    selector: 'data-browser',
    templateUrl: './data-browser.component.html',
    styleUrls: ['./data-browser.component.css'],
    standalone: true,
    imports: [MatFormField, MatLabel, MatInput, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, NgFor, DataBrowserRowComponent, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatNoDataRow, MatPaginator, KeyValuePipe]
})
export class DataBrowserComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private pathsSubscription: Subscription = null;
  private dataTableTimer = null;

  public pageSize: number = 10;
  public tableData = new MatTableDataSource<IPathData>([]);
  public displayedColumns: string[] = ['path', 'defaultSource'];

  constructor(
    private signalKDataService: SignalKDataService,
    private cdRef: ChangeDetectorRef) { }

  public onResize(event) {
    this.setNumPerPage(event.target.innerHeight, event.target.innerWidth);
  }

  ngOnInit() {
    setTimeout(()=>{
      this.pathsSubscription = this.signalKDataService.getSkDataObservable().subscribe(paths => {
        this.tableData.data = paths;
      })}, 0); // set timeout to make it async otherwise delays page load
  }

  ngAfterViewInit() {
    this.tableData.paginator = this.paginator;
    this.tableData.sort = this.sort;
    this.tableData.filter = "self.";
    this.setNumPerPage(window.innerHeight, window.innerWidth);
    this.cdRef.detectChanges();
  }

  public applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.tableData.filter = filterValue.trim().toLowerCase();

    if (this.tableData.paginator) {
      this.tableData.paginator.firstPage();
    }
  }

  public trackByPath(index: number, item: IPathData): string {
    return `${item.path}`;
  }

  public trackBySource(index: number, item): string {
    return `${item.key}`;
  }

  private setNumPerPage(height: number, width: number){
    if (width < 750) {
      this.pageSize = 5;
    } else if (height > 900) {
      this.pageSize = 15;
    } else if (height > 750 && height < 900) {
      this.pageSize = 10;
    } else {
      this.pageSize = 5;
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.dataTableTimer);
    this.pathsSubscription?.unsubscribe();
  }
}
